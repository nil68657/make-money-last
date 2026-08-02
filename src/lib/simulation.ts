import {
  Assumptions,
  CategoryComparison,
  ComparisonResult,
  ExpenseBreakdown,
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  EXPENSE_LABELS,
  LocationProfile,
  MonthlySnapshot,
  SimulationInputs,
  SimulationResult,
} from "./types";
import { getEffectivePpp } from "./ppp-data";
import { equivalentIncome, monthlyTakeHome } from "./cost-model";

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
 *   balance(m)   = max(0, balance(m-1) * (1 + investmentReturn/12) + net(m))
 *
 * Notes on the deliberate modelling choices:
 *
 *   - Inflation and returns are compounded monthly at rate/12 (nominal annual
 *     rate convention), not (1+rate)^(1/12). Consistent throughout.
 *   - `inflationMultiplier` is the basket-weighted cumulative price level, taken
 *     as totalExpenses(m) / totalExpenses(0). Using the real basket rather than
 *     the headline rate means the deflator respects the per-category multipliers.
 *   - The balance floors at zero. Once savings are exhausted you cannot keep
 *     drawing from an empty account, so the shortfall becomes a cashflow problem
 *     rather than an ever-deepening negative asset. Runway is still measured
 *     from the uncapped crossing, so precision isn't lost.
 *
 * Runway is the first month the balance would go non-positive, refined to a
 * fraction of a month by linear interpolation between the bracketing months.
 */

export function sumExpenses(expenses: ExpenseBreakdown): number {
  return (
    expenses.medical +
    expenses.school +
    expenses.food +
    expenses.rent +
    expenses.utilities +
    expenses.other
  );
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

function inflateExpenses(
  base: ExpenseBreakdown,
  profile: LocationProfile,
  assumptions: Assumptions,
  monthIndex: number
): ExpenseBreakdown {
  const out = {} as ExpenseBreakdown;
  for (const category of EXPENSE_CATEGORIES) {
    const annual = categoryInflationRate(profile, assumptions, category);
    out[category] =
      base[category] * Math.pow(1 + annual / 100 / 12, monthIndex);
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

  const monthlyReturn = assumptions.investmentReturn / 100 / 12;
  const monthlyGrowth = assumptions.incomeGrowth / 100 / 12;
  const baseTakeHome = monthlyTakeHome(profile.annualIncome, assumptions);
  const baseExpenses = sumExpenses(profile.expenses);

  const trajectory: MonthlySnapshot[] = [];
  let savings = inputs.currentSavings;
  let runwayMonths: number | null = null;
  let runwayMonthsExact: number | null = null;
  let breakEvenMonth: number | null = null;

  for (let m = 0; m <= inputs.projectionMonths; m++) {
    const inflated = inflateExpenses(profile.expenses, profile, assumptions, m);
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

    trajectory.push({
      monthIndex: m,
      date: formatMonthLabel(addMonths(startDate, m)),
      savings,
      monthlyIncome: income,
      monthlyBurn: Math.max(0, totalExpenses - income),
      monthlyNet,
      totalExpenses,
      // Balance restated in the city's present-day prices.
      pppAdjustedSavings:
        inflationMultiplier > 0 ? savings / inflationMultiplier : savings,
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
    finalPppSavings: last.pppAdjustedSavings,
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

  const pppAdvantageB = locationB.finalPppSavings - locationA.finalPppSavings;

  const runwayDifferenceMonths = diffRunway(
    locationA.runwayMonths,
    locationB.runwayMonths,
    inputs.projectionMonths
  );

  const costOfLivingDeltaPercent =
    (inputs.locationB.colIndex / Math.max(0.05, inputs.locationA.colIndex) - 1) *
    100;

  const categories: CategoryComparison[] = EXPENSE_CATEGORIES.map((category) => {
    const a = inputs.locationA.expenses[category];
    const b = inputs.locationB.expenses[category];
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
