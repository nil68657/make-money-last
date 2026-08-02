/**
 * Core domain types for the relocation runway simulator.
 *
 * Money model: every figure the simulator produces is expressed in the
 * *display currency*, which is the currency of the **destination** city — you
 * are deciding whether to move there, so that is the unit the answer matters
 * in. Household income is entered in it directly.
 *
 * Three separate multipliers, deliberately never merged (see `lib/fx.ts`):
 *
 *   FX         unit conversion only. Applied to the savings you already hold,
 *              and to any budget row the user has denominated in a currency
 *              other than the display one. Never to a price level.
 *   colIndex   city basket cost vs the US average. Re-prices the budget, and
 *              because it is a real-terms index it yields expenses already in
 *              the same unit as the income it was derived from.
 *   ppp        country price level vs the US. Used only for the international
 *              -dollars lens, never for the budget.
 */

import type { FxSnapshot } from "./fx";

export interface ExpenseBreakdown {
  medical: number;
  school: number;
  food: number;
  rent: number;
  utilities: number;
  other: number;
  /** Committed savings and investments: pension, SIP, anything locked away. */
  savings: number;
  /** Discretionary spending the household treats as a standing commitment. */
  discretionary: number;
  misc: number;
}

export type ExpenseCategory = keyof ExpenseBreakdown;

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "rent",
  "food",
  "medical",
  "school",
  "utilities",
  "other",
  "savings",
  "discretionary",
  "misc",
];

/**
 * One row of the budget.
 *
 * Rows exist because a relocated household's costs are not all in one
 * currency. Someone moving Bangalore → Seattle keeps paying a home-loan EMI
 * and school fees in INR while paying rent and groceries in USD, and a model
 * that forces every line into the destination currency cannot express that.
 *
 * So each row carries its own `currency`, and two things follow from it:
 *
 *   - the amount is converted into the display currency at the market rate
 *     before it reaches the projection, and
 *   - the row inflates at *its own economy's* rate. INR school fees inflate at
 *     Indian rates even while being displayed in dollars, because the fee is
 *     set in rupees by an Indian school.
 */
export interface ExpenseLineItem {
  /** Stable key. Built-ins use their category name; custom rows get a uid. */
  id: string;
  /** Bucket this rolls up into for the category chart and comparison. */
  category: ExpenseCategory;
  label: string;
  /** The amount exactly as the user typed it, denominated in `currency`. */
  amount: number;
  /** ISO 4217 code the amount is entered in. */
  currency: string;
  /** True once hand-edited, so the cost model stops re-deriving the amount. */
  overridden: boolean;
  /** A row the user added. Never auto-derived, and removable. */
  custom: boolean;
}

/**
 * A city in the reference dataset.
 *
 * All figures are approximate reference values compiled from public sources
 * (see `src/lib/cities.ts`). They are stable defaults meant to be overridden by
 * the user, not live market data.
 */
export interface CityRecord {
  /** Stable slug, e.g. "us-new-york-ny". */
  id: string;
  city: string;
  /** State / province / region. Empty string for city-states. */
  region: string;
  country: string;
  /** ISO 3166-1 alpha-2, uppercase. Used to render the flag emoji. */
  countryCode: string;
  /** ISO 4217 currency code. */
  currency: string;
  /** Cost-of-living index where 100 = US national average. */
  colIndex: number;
  /**
   * Price level ratio vs the United States (US = 1.00): what one US dollar of
   * goods costs locally at market exchange rates. Drives real-buying-power math.
   */
  ppp: number;
  /** Default annual inflation assumption, percent. */
  inflation: number;
  /** Extra search terms (former names, nicknames, airport codes). */
  aliases?: string[];
  /** Surfaced in the combobox before the user types anything. */
  popular?: boolean;
}

/** One side of the comparison: a city plus the budget assumed for it. */
export interface LocationProfile {
  cityId: string;
  /** Display label, e.g. "Austin, TX". */
  name: string;
  country: string;
  countryCode: string;
  currency: string;
  colIndex: number;
  /** Gross annual household income assumed for this location. */
  annualIncome: number;
  /**
   * The budget, one row at a time, each in its own currency. This is the
   * source of truth; `ExpenseBreakdown` is only ever a rollup of it, resolved
   * into the display currency.
   */
  lineItems: ExpenseLineItem[];
  /** Extra monthly savings inflow: employer match, RSU vesting, side income. */
  monthlySavingsContribution: number;
  /** Annual inflation rate, percent. */
  inflationRate: number;
  /** Price level ratio vs the US (US = 1.00). */
  pppIndex: number;
  useManualPpp: boolean;
  manualPppRatio: number;
  /**
   * Long-run nominal annual return on money invested in *this* location's
   * market, percent. Pre-filled from the country (see `market-data.ts`): if
   * you move, your savings move into the destination's market, so each side
   * of the comparison grows at its own rate rather than a shared one.
   */
  marketReturn: number;
  /** Freezes `marketReturn` against city changes once the user has set it. */
  useManualReturn: boolean;
  /** Index the default was anchored to, so the UI can name the assumption. */
  marketIndex: string;
}

/** Model dials exposed through the assumptions drawer. */
export interface Assumptions {
  /**
   * Share of the balance held in the market rather than as cash, percent.
   * Cash earns nothing here, so this scales each location's market return —
   * someone sitting on cash should not be modelled as holding equities.
   */
  investedPercentage: number;
  /** Annual nominal raise applied to income, percent. */
  incomeGrowth: number;
  /** Flat effective tax + payroll rate applied to gross income, percent. */
  effectiveTaxRate: number;
  /**
   * When true, income in the destination city is re-scaled to the local market
   * using the cost-of-living ratio. When false the salary travels with you.
   */
  adjustSalaryToLocalMarket: boolean;
  /**
   * Multiplier on each city's headline inflation, per category. Medical and
   * education have historically outpaced headline CPI; rent tracks it closely.
   */
  categoryInflation: Record<ExpenseCategory, number>;
  /**
   * Annual drift of foreign currencies against the display currency, percent.
   * Positive means foreign-denominated costs get *more* expensive in display
   * terms over time.
   *
   * A cross-currency obligation is not a fixed cost. An INR school fee looks
   * flat in rupees and moves every year in dollars, and pretending otherwise
   * is the quiet way this kind of model misleads. Defaults to 0 — today's rate
   * held forever — because a forecast nobody asked for is worse than an
   * assumption stated plainly, but the dial is there and the UI names the
   * inflation-differential figure that relative PPP would imply.
   */
  fxDriftPercent: number;
}

/** How the starting balance was brought into the display currency. */
export interface SavingsConversion {
  /** Amount as the user typed it, in their current city's currency. */
  enteredAmount: number;
  enteredCurrency: string;
  /** Multiplier applied. 1 when both cities share a currency. */
  rate: number;
  /** ISO instant of the rate used, and where it came from. */
  ratesAsOf: string;
  ratesSource: "live" | "cache" | "fallback";
}

export interface SimulationInputs {
  /** MM-DD-YYYY. */
  asOfDate: string;
  /** ISO 4217 code every output figure is denominated in — the destination. */
  displayCurrency: string;
  /** Liquid savings / net worth at the start, in the display currency. */
  currentSavings: number;
  /** Provenance of `currentSavings`, so the UI can show its working. */
  savingsConversion: SavingsConversion;
  projectionMonths: number;
  locationA: LocationProfile;
  locationB: LocationProfile;
  assumptions: Assumptions;
  /**
   * Rates in force for this run. Part of the inputs rather than read from a
   * hook, so a projection is a pure function of what you can see on screen —
   * and so the same inputs always reproduce the same numbers.
   */
  fx: FxSnapshot;
}

export interface MonthlySnapshot {
  monthIndex: number;
  /** "Mar 2027" */
  date: string;
  savings: number;
  monthlyIncome: number;
  monthlyBurn: number;
  monthlyNet: number;
  totalExpenses: number;
  /** Savings restated as buying power in City A's present-day prices. */
  pppAdjustedSavings: number;
  /** Cumulative price multiplier since month 0 for this city. */
  inflationMultiplier: number;
}

export interface SimulationResult {
  locationName: string;
  /** What every figure below is denominated in: the display currency. */
  currency: string;
  /** The city's own currency, for copy that names it. May differ from above. */
  localCurrency: string;
  pppIndex: number;
  colIndex: number;
  /** Nominal annual return assumed for this location's market, percent. */
  marketReturn: number;
  /** Index that assumption is anchored to, e.g. "Nifty 50 TRI". */
  marketIndex: string;
  /** `marketReturn` after this location's inflation, by Fisher. Percent. */
  realMarketReturn: number;
  /** What the balance actually earns once the cash share is held back. */
  effectiveReturn: number;
  /** Monthly take-home income at month 0. */
  monthlyIncome: number;
  /** Month-0 spend that is not covered by income (0 when cashflow positive). */
  monthlyBurn: number;
  monthlyExpenses: number;
  monthlyNet: number;
  /** Share of take-home income retained at month 0, percent. */
  savingsRate: number;
  /** Whole months until savings hit zero. Null if they never do in-window. */
  runwayMonths: number | null;
  /** Fractional months until depletion, for smoother copy and charts. */
  runwayMonthsExact: number | null;
  runwayLabel: string;
  /** First month where the balance exceeds double the starting savings. */
  breakEvenMonth: number | null;
  finalSavings: number;
  finalPppSavings: number;
  trajectory: MonthlySnapshot[];
}

export interface CategoryComparison {
  category: ExpenseCategory;
  label: string;
  a: number;
  b: number;
  /** Percent change from A to B. Null when A is zero. */
  deltaPercent: number | null;
}

export interface ComparisonResult {
  locationA: SimulationResult;
  locationB: SimulationResult;
  currency: string;
  /** Real buying-power gap at the end of the projection (B minus A). */
  pppAdvantageB: number;
  /** Runway gap in months (B minus A). Null when neither depletes. */
  runwayDifferenceMonths: number | null;
  /** (colB / colA - 1) * 100 */
  costOfLivingDeltaPercent: number;
  /** Income needed in City B to hold City A's standard of living. */
  equivalentIncomeInB: number;
  categories: CategoryComparison[];
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  investedPercentage: 80,
  incomeGrowth: 2.5,
  effectiveTaxRate: 25,
  adjustSalaryToLocalMarket: false,
  fxDriftPercent: 0,
  categoryInflation: {
    rent: 1,
    food: 1.1,
    medical: 1.6,
    school: 1.4,
    utilities: 1.2,
    other: 1,
    // A savings commitment is a number you choose, not a price you are quoted,
    // so it does not track CPI unless the user says so.
    savings: 0,
    discretionary: 1,
    misc: 1,
  },
};

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent / mortgage / EMI",
  food: "Food & groceries",
  medical: "Medical & insurance",
  school: "School & childcare",
  utilities: "Utilities & internet",
  other: "Transport & insurance",
  savings: "Savings & investments",
  discretionary: "Extra funds & discretionary",
  misc: "Miscellaneous",
};

/**
 * Short forms for places that already carry the category context, such as the
 * inflation-multiplier grid. Deliberately not substrings of `EXPENSE_LABELS`, so
 * a label lookup for a budget field can never resolve to a multiplier field.
 */
export const EXPENSE_SHORT_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent",
  food: "Food",
  medical: "Medical",
  school: "School",
  utilities: "Utilities",
  other: "Transport",
  savings: "Savings",
  discretionary: "Discretionary",
  misc: "Misc",
};

export const EXPENSE_HINTS: Record<ExpenseCategory, string> = {
  rent: "Monthly rent, or mortgage EMI plus property tax and HOA. Keep it in the currency the loan is denominated in.",
  food: "Groceries plus eating out.",
  medical: "Premiums, out-of-pocket visits, prescriptions.",
  school: "Tuition, daycare, after-school and supplies.",
  utilities: "Power, water, gas, mobile and broadband.",
  other: "Transport, vehicle and personal insurance, travel.",
  savings:
    "Money committed somewhere you will not draw on: pension, SIP, a locked deposit. It leaves your liquid runway, which is why it counts as an outflow here rather than as a balance.",
  discretionary:
    "Standing discretionary spend: subscriptions, hobbies, gifts, the fund you top up for anything that comes along.",
  misc: "Whatever the other lines do not cover.",
};
