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
 *   FX         unit conversion only. Used once, to bring the savings you
 *              already hold in your current city's currency into the display
 *              currency.
 *   colIndex   city basket cost vs the US average. Re-prices the budget, and
 *              because it is a real-terms index it yields expenses already in
 *              the same unit as the income it was derived from.
 *   ppp        country price level vs the US. Used only for the international
 *              -dollars lens, never for the budget.
 */

export interface ExpenseBreakdown {
  medical: number;
  school: number;
  food: number;
  rent: number;
  utilities: number;
  other: number;
}

export type ExpenseCategory = keyof ExpenseBreakdown;

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "rent",
  "food",
  "medical",
  "school",
  "utilities",
  "other",
];

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
  expenses: ExpenseBreakdown;
  /**
   * Categories the user has hand-edited. Untouched categories keep tracking the
   * auto-derived cost model when income or city changes.
   */
  overriddenCategories: ExpenseCategory[];
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
  categoryInflation: {
    rent: 1,
    food: 1.1,
    medical: 1.6,
    school: 1.4,
    utilities: 1.2,
    other: 1,
  },
};

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent / mortgage",
  food: "Food & groceries",
  medical: "Medical & insurance",
  school: "School & childcare",
  utilities: "Utilities & internet",
  other: "Transport & everything else",
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
};

export const EXPENSE_HINTS: Record<ExpenseCategory, string> = {
  rent: "Monthly rent, or mortgage EMI plus property tax and HOA.",
  food: "Groceries plus eating out.",
  medical: "Premiums, out-of-pocket visits, prescriptions.",
  school: "Tuition, daycare, after-school and supplies.",
  utilities: "Power, water, gas, mobile and broadband.",
  other: "Transport, insurance, travel, subscriptions, shopping.",
};
