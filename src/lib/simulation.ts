import {
  Assumptions,
  CategoryComparison,
  ComparisonResult,
  ExpenseBreakdown,
  ExpenseCategory,
  ExpenseLineItem,
  EXPENSE_CATEGORIES,
  EXPENSE_LABELS,
  LocationProfile,
  MonthlySnapshot,
  SimulationInputs,
  SimulationResult,
} from "./types";
import { getEffectivePpp, toInternationalDollars } from "./ppp-data";
import { blendedReturn, realReturn } from "./market-data";
import { inflationForCurrency } from "./cities";
import { convertAmount } from "./fx";
import {
  emptyBreakdown,
  equivalentIncome,
  monthlyTakeHome,
  resolveExpenses,
} from "./cost-model";

/**
 * The simulation model, month by month.
 *
 * Everything is denominated in the *display currency* — the currency of the
 * destination city (`inputs.displayCurrency`). Both sides' budgets are derived
 * from incomes already expressed in that unit and re-priced by cost-of-living
 * index, so no exchange rate appears anywhere in this file. FX is applied once,
 * upstream, to the starting balance alone.
 *
 * For each month m (m = 0 is the starting month, untouched):
 *
 *   income(m)    = grossMonthly * (1 + incomeGrowth/12) ^ m, then taxed at the
 *                  flat effective rate
 *   expense_c(m) = base_c * (1 + (inflation * categoryMultiplier_c)/12) ^ m
 *   net(m)       = income(m) - Σ expense_c(m) + extraContribution
 *   r            = marketReturn * investedPercentage / 100   (annual, nominal)
 *   balance(m)   = max(0, balance(m-1) * (1 + r/12) + net(m))
 *
 * Notes on the deliberate modelling choices:
 *
 *   - `marketReturn` is the *location's own* market (see `market-data.ts`), so
 *     the two sides of a comparison compound at different rates. It is nominal;
 *     inflation is applied separately to the expense side, and the real return
 *     is derived for display only, never fed back into the balance. Applying
 *     inflation to both the balance and the basket would deflate twice.
 *   - Only `investedPercentage` of the balance earns. Cash earns nothing.
 *   - Inflation and returns are compounded monthly at rate/12 (nominal annual
 *     rate convention), not (1+rate)^(1/12). Consistent throughout.
 *   - `inflationMultiplier` is the basket-weighted cumulative price level, taken
 *     as totalExpenses(m) / totalExpenses(0). Using the real basket rather than
 *     the headline rate means the deflator respects the per-category multipliers.
 *   - The balance is reported through three lenses — `savings` (nominal),
 *     `realSavings` (÷ inflationMultiplier, this city's month-0 prices) and
 *     `intlSavings` (÷ ppp as well, US-equivalent buying power). Only the last
 *     may be compared across countries; the first two are same-country views.
 *     Deflating over time and deflating across borders are different questions,
 *     and `ppp-data.ts` sets out why composing them double-counts nothing.
 *   - The balance floors at zero. Once savings are exhausted you cannot keep
 *     drawing from an empty account, so the shortfall becomes a cashflow problem
 *     rather than an ever-deepening negative asset. Runway is still measured
 *     from the uncapped crossing, so precision isn't lost.
 *
 * Runway is the first month the balance would go non-positive, refined to a
 * fraction of a month by linear interpolation between the bracketing months.
 */

export function sumExpenses(expenses: ExpenseBreakdown): number {
  let total = 0;
  for (const category of EXPENSE_CATEGORIES) total += expenses[category] ?? 0;
  return total;
}

export function parseAsOfDate(dateStr: string): Date {
  const match = dateStr?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return new Date();
  const [, mm, dd, yyyy] = match;
  const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function formatDateInput(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}-${dd}-${date.getFullYear()}`;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), 1);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Effective annual inflation for one category, after its multiplier. */
export function categoryInflationRate(
  profile: LocationProfile,
  assumptions: Assumptions,
  category: ExpenseCategory
): number {
  return profile.inflationRate * assumptions.categoryInflation[category];
}

/**
 * Annual inflation for one row, before the category multiplier.
 *
 * A row left in the display currency is an ordinary local cost, and inflates
 * at this location's rate — read off the profile, since the user can edit it.
 * A row the user has deliberately moved to another currency is a price set in
 * *that* economy: an Indian school raises its fees at Indian inflation whether
 * or not the family has moved to Seattle, so the rupee figure follows India
 * and is only converted afterwards, for display.
 *
 * The comparison is against the *display* currency rather than the location's
 * own, and that distinction matters more than it looks. Every derived row is
 * denominated in the display currency on both sides of the comparison, so
 * comparing against the location's currency would classify New York's own
 * grocery bill as a foreign obligation the moment results were shown in euros
 * — and the projection would then change depending on which unit you happened
 * to be reading it in.
 */
export function lineItemInflationRate(
  item: ExpenseLineItem,
  profile: LocationProfile,
  assumptions: Assumptions,
  displayCurrency: string
): number {
  const headline =
    item.currency === displayCurrency
      ? profile.inflationRate
      : inflationForCurrency(item.currency);
  return headline * assumptions.categoryInflation[item.category];
}

/**
 * Resolve every row into the display currency at month `monthIndex`, applying
 * each row's own inflation and, for foreign rows, the FX drift assumption.
 *
 *   amount_display(m) = amount_local
 *                     * fxRate(rowCurrency -> display)
 *                     * (1 + rowInflation/12) ^ m
 *                     * (1 + fxDrift/12) ^ m      // foreign rows only
 *
 * The drift term is what stops a cross-currency obligation being modelled as a
 * fixed cost. An EMI that never changes in rupees changes every year in
 * dollars, and at 0% drift the model says so explicitly rather than by
 * omission.
 */
function inflateLineItems(
  profile: LocationProfile,
  inputs: SimulationInputs,
  monthIndex: number
): ExpenseBreakdown {
  const { assumptions, displayCurrency, fx } = inputs;
  const monthlyDrift = assumptions.fxDriftPercent / 100 / 12;
  const out = emptyBreakdown();

  for (const item of profile.lineItems) {
    const annual = lineItemInflationRate(
      item,
      profile,
      assumptions,
      displayCurrency
    );
    const converted = convertAmount(
      item.amount,
      item.currency,
      displayCurrency,
      fx
    );
    const inflated = converted * Math.pow(1 + annual / 100 / 12, monthIndex);
    const drifted =
      item.currency === displayCurrency
        ? inflated
        : inflated * Math.pow(1 + monthlyDrift, monthIndex);
    out[item.category] += drifted;
  }
  return out;
}

export function simulateLocation(
  profile: LocationProfile,
  inputs: SimulationInputs
): SimulationResult {
  const { assumptions } = inputs;
  const startDate = parseAsOfDate(inputs.asOfDate);
  const ppp = getEffectivePpp(
    profile.pppIndex,
    profile.useManualPpp,
    profile.manualPppRatio
  );

  // Each side grows at its *own* market's rate: if you move, your savings move
  // with you into the destination's market, so "stay" and "go" are not two
  // paths through the same portfolio. Only the invested share earns.
  const effectiveReturn = blendedReturn(
    profile.marketReturn,
    assumptions.investedPercentage
  );
  const monthlyReturn = effectiveReturn / 100 / 12;
  const monthlyGrowth = assumptions.incomeGrowth / 100 / 12;
  const baseTakeHome = monthlyTakeHome(profile.annualIncome, assumptions);
  const baseBreakdown = inflateLineItems(profile, inputs, 0);
  const baseExpenses = sumExpenses(baseBreakdown);

  const trajectory: MonthlySnapshot[] = [];
  let savings = inputs.currentSavings;
  let runwayMonths: number | null = null;
  let runwayMonthsExact: number | null = null;
  let breakEvenMonth: number | null = null;

  for (let m = 0; m <= inputs.projectionMonths; m++) {
    const inflated = inflateLineItems(profile, inputs, m);
    const totalExpenses = sumExpenses(inflated);
    const income = baseTakeHome * Math.pow(1 + monthlyGrowth, m);
    const monthlyNet =
      income - totalExpenses + profile.monthlySavingsContribution;

    if (m > 0) {
      // Return accrues on the balance carried into the month, then cashflow
      // settles. Only a positive balance earns.
      const opening = savings;
      const growth = opening > 0 ? opening * monthlyReturn : 0;
      const uncapped = opening + growth + monthlyNet;

      if (runwayMonths === null && uncapped <= 0) {
        runwayMonths = m;
        runwayMonthsExact =
          opening > uncapped ? m - 1 + opening / (opening - uncapped) : m;
      }

      savings = Math.max(0, uncapped);
    }

    const inflationMultiplier =
      baseExpenses > 0
        ? totalExpenses / baseExpenses
        : Math.pow(1 + profile.inflationRate / 100 / 12, m);

    // Three lenses on one balance, each a strictly separate adjustment:
    // nominal is untouched; real divides out this city's inflation over time;
    // international further divides out its price level against the US, which
    // is the only step that makes two countries comparable. See `ppp-data.ts`.
    const realSavings =
      inflationMultiplier > 0 ? savings / inflationMultiplier : savings;

    trajectory.push({
      monthIndex: m,
      date: formatMonthLabel(addMonths(startDate, m)),
      savings,
      monthlyIncome: income,
      monthlyBurn: Math.max(0, totalExpenses - income),
      monthlyNet,
      totalExpenses,
      realSavings,
      intlSavings: toInternationalDollars(realSavings, ppp),
      inflationMultiplier,
    });

    if (
      breakEvenMonth === null &&
      m > 0 &&
      inputs.currentSavings > 0 &&
      savings >= inputs.currentSavings * 2
    ) {
      breakEvenMonth = m;
    }
  }

  const last = trajectory[trajectory.length - 1];
  const first = trajectory[0];
  const savingsRate =
    baseTakeHome > 0 ? (first.monthlyNet / baseTakeHome) * 100 : 0;

  return {
    locationName: profile.name,
    currency: inputs.displayCurrency,
    localCurrency: profile.currency,
    pppIndex: ppp,
    colIndex: profile.colIndex,
    marketReturn: profile.marketReturn,
    marketIndex: profile.marketIndex,
    realMarketReturn: realReturn(profile.marketReturn, profile.inflationRate),
    effectiveReturn,
    monthlyIncome: baseTakeHome,
    monthlyBurn: first.monthlyBurn,
    monthlyExpenses: baseExpenses,
    monthlyNet: first.monthlyNet,
    savingsRate,
    runwayMonths,
    runwayMonthsExact,
    runwayLabel: computeRunwayLabel(
      runwayMonths,
      first.monthlyNet,
      inputs.projectionMonths
    ),
    breakEvenMonth,
    finalSavings: last.savings,
    finalRealSavings: last.realSavings,
    finalIntlSavings: last.intlSavings,
    trajectory,
  };
}

function computeRunwayLabel(
  runwayMonths: number | null,
  monthlyNet: number,
  projectionMonths: number
): string {
  if (runwayMonths === null) {
    return monthlyNet >= 0
      ? "Never — savings grow"
      : `Beyond ${Math.round(projectionMonths / 12)} years`;
  }
  if (runwayMonths === 0) return "Already depleted";
  const years = Math.floor(runwayMonths / 12);
  const months = runwayMonths % 12;
  if (years === 0) return `${months} month${months === 1 ? "" : "s"}`;
  if (months === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years}y ${months}m`;
}

export function runComparison(inputs: SimulationInputs): ComparisonResult {
  const locationA = simulateLocation(inputs.locationA, inputs);
  const locationB = simulateLocation(inputs.locationB, inputs);

  // Both sides are already in one currency, so this subtraction is only asking
  // which pile is bigger. Whether it *buys* more needs the price levels off
  // first: ₹1 in Mumbai and $1 in Zurich are the same unit here and nothing
  // like the same groceries. Hence two figures, not one.
  const realAdvantageB = locationB.finalRealSavings - locationA.finalRealSavings;
  const pppAdvantageB = locationB.finalIntlSavings - locationA.finalIntlSavings;

  const runwayDifferenceMonths = diffRunway(
    locationA.runwayMonths,
    locationB.runwayMonths,
    inputs.projectionMonths
  );

  const costOfLivingDeltaPercent =
    (inputs.locationB.colIndex / Math.max(0.05, inputs.locationA.colIndex) - 1) *
    100;

  const expensesA = resolveExpenses(
    inputs.locationA.lineItems,
    inputs.displayCurrency,
    inputs.fx
  );
  const expensesB = resolveExpenses(
    inputs.locationB.lineItems,
    inputs.displayCurrency,
    inputs.fx
  );

  const categories: CategoryComparison[] = EXPENSE_CATEGORIES.map((category) => {
    const a = expensesA[category];
    const b = expensesB[category];
    return {
      category,
      label: EXPENSE_LABELS[category],
      a,
      b,
      deltaPercent: a > 0 ? (b / a - 1) * 100 : null,
    };
  });

  return {
    locationA,
    locationB,
    currency: inputs.displayCurrency,
    pppAdvantageB,
    realAdvantageB,
    runwayDifferenceMonths,
    costOfLivingDeltaPercent,
    equivalentIncomeInB: equivalentIncome(
      inputs.locationA.annualIncome,
      inputs.locationA.colIndex,
      inputs.locationB.colIndex
    ),
    categories,
  };
}

/**
 * Runway gap in months (B minus A). When one side never depletes we clamp it to
 * the projection horizon so the delta stays meaningful instead of null.
 */
function diffRunway(
  a: number | null,
  b: number | null,
  projectionMonths: number
): number | null {
  if (a === null && b === null) return null;
  const aVal = a ?? projectionMonths;
  const bVal = b ?? projectionMonths;
  return bVal - aVal;
}
