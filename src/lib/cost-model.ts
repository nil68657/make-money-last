import {
  Assumptions,
  CityRecord,
  ExpenseBreakdown,
  ExpenseCategory,
  LocationProfile,
} from "./types";
import { marketReturnFor } from "./market-data";

/**
 * Cost model: turning "a city + a household income" into a monthly budget.
 *
 * The landing page only asks for four numbers, so the simulator has to invent a
 * defensible starting budget. It does that in two steps:
 *
 *   1. Baseline shares — what fraction of *gross* income a household spends on
 *      each category in a city at the US national average cost of living.
 *      Loosely modelled on BLS Consumer Expenditure Survey shares.
 *
 *   2. Cost-of-living elasticity — how hard each category reacts to the local
 *      cost-of-living index. Housing does almost all of the work: rent in a
 *      160-index metro is far more than 1.6x the national average, while
 *      groceries and medical premiums barely move. Elasticities below 1 damp
 *      the response, above 1 amplify it.
 *
 *      expense_c = grossMonthly * share_c * (colIndex / 100) ^ elasticity_c
 *
 * Everything here is a transparent, editable default. The user can override any
 * single category and the rest keep tracking the model.
 */

/** Share of gross monthly income, at colIndex 100. Sums to ~0.565. */
export const BASELINE_SHARES: Record<ExpenseCategory, number> = {
  rent: 0.22,
  food: 0.09,
  medical: 0.05,
  school: 0.03,
  utilities: 0.045,
  other: 0.12,
};

/** Sensitivity of each category to the local cost-of-living index. */
export const COL_ELASTICITY: Record<ExpenseCategory, number> = {
  rent: 1.25,
  food: 0.45,
  medical: 0.3,
  school: 0.7,
  utilities: 0.35,
  other: 0.5,
};

const CATEGORIES = Object.keys(BASELINE_SHARES) as ExpenseCategory[];

/** Derive a full monthly budget from gross annual income and a COL index. */
export function deriveExpenses(
  annualIncome: number,
  colIndex: number
): ExpenseBreakdown {
  const grossMonthly = Math.max(0, annualIncome) / 12;
  const ratio = Math.max(0.05, colIndex) / 100;

  const out = {} as ExpenseBreakdown;
  for (const category of CATEGORIES) {
    const scaled =
      grossMonthly *
      BASELINE_SHARES[category] *
      Math.pow(ratio, COL_ELASTICITY[category]);
    out[category] = Math.round(scaled);
  }
  return out;
}

/**
 * Re-derive the budget while preserving any category the user hand-edited.
 */
export function mergeDerivedExpenses(
  current: ExpenseBreakdown,
  derived: ExpenseBreakdown,
  overridden: ExpenseCategory[]
): ExpenseBreakdown {
  const out = { ...derived };
  for (const category of overridden) {
    out[category] = current[category];
  }
  return out;
}

/**
 * Income assumed at a destination. With `adjustSalaryToLocalMarket` off the
 * salary travels with you (the remote-work case). With it on, pay is re-scaled
 * to the local market using the cost-of-living ratio.
 */
export function incomeForDestination(
  baseAnnualIncome: number,
  colIndexFrom: number,
  colIndexTo: number,
  adjustToLocalMarket: boolean
): number {
  if (!adjustToLocalMarket) return baseAnnualIncome;
  const ratio = Math.max(0.05, colIndexTo) / Math.max(0.05, colIndexFrom);
  return Math.round(baseAnnualIncome * ratio);
}

/**
 * NerdWallet-style equivalence: the income needed in the destination to hold
 * the same standard of living. A straight cost-of-living index ratio.
 */
export function equivalentIncome(
  annualIncome: number,
  colIndexFrom: number,
  colIndexTo: number
): number {
  const ratio = Math.max(0.05, colIndexTo) / Math.max(0.05, colIndexFrom);
  return Math.round(annualIncome * ratio);
}

/** Build a fresh location profile for a city at a given income. */
export function buildLocationProfile(
  city: CityRecord,
  annualIncome: number
): LocationProfile {
  const market = marketReturnFor(city.countryCode);
  return {
    cityId: city.id,
    name: cityLabel(city),
    country: city.country,
    countryCode: city.countryCode,
    currency: city.currency,
    colIndex: city.colIndex,
    annualIncome,
    expenses: deriveExpenses(annualIncome, city.colIndex),
    overriddenCategories: [],
    monthlySavingsContribution: 0,
    inflationRate: city.inflation,
    pppIndex: city.ppp,
    useManualPpp: false,
    manualPppRatio: city.ppp,
    marketReturn: market.nominalReturn,
    useManualReturn: false,
    marketIndex: market.index,
  };
}

/**
 * Point an existing profile at a new city (or income) without losing the
 * user's manual category edits or assumption tweaks.
 */
export function retargetLocationProfile(
  profile: LocationProfile,
  city: CityRecord,
  annualIncome: number,
  options: { resetInflationAndPpp?: boolean } = {}
): LocationProfile {
  const cityChanged = profile.cityId !== city.id;
  const derived = deriveExpenses(annualIncome, city.colIndex);
  const resetRates = options.resetInflationAndPpp ?? cityChanged;
  // A market return the user typed is a view about their own portfolio, not
  // about the city, so it survives a change of destination. An untouched one
  // follows the country, since that is the whole point of the default.
  const market = marketReturnFor(city.countryCode);
  const adoptMarket = resetRates && !profile.useManualReturn;

  return {
    ...profile,
    cityId: city.id,
    name: cityLabel(city),
    country: city.country,
    countryCode: city.countryCode,
    currency: city.currency,
    colIndex: cityChanged ? city.colIndex : profile.colIndex,
    annualIncome,
    expenses: mergeDerivedExpenses(
      profile.expenses,
      derived,
      profile.overriddenCategories
    ),
    inflationRate: resetRates ? city.inflation : profile.inflationRate,
    pppIndex: resetRates ? city.ppp : profile.pppIndex,
    manualPppRatio: resetRates ? city.ppp : profile.manualPppRatio,
    marketReturn: adoptMarket ? market.nominalReturn : profile.marketReturn,
    marketIndex: adoptMarket ? market.index : profile.marketIndex,
  };
}

/**
 * The region only earns its place in the label when it says something new.
 * Around 70 records in the dataset are capital regions or city-states where the
 * region repeats the city ("Tokyo, Tokyo", "Lisbon, Lisbon").
 */
export function cityRegion(city: Pick<CityRecord, "city" | "region">): string {
  if (!city.region) return "";
  return city.region.toLowerCase() === city.city.toLowerCase()
    ? ""
    : city.region;
}

export function cityLabel(city: CityRecord): string {
  const region = cityRegion(city);
  return region ? `${city.city}, ${region}` : city.city;
}

/** Monthly take-home after the flat effective tax assumption. */
export function monthlyTakeHome(
  annualIncome: number,
  assumptions: Assumptions
): number {
  const rate = Math.min(0.9, Math.max(0, assumptions.effectiveTaxRate / 100));
  return (Math.max(0, annualIncome) / 12) * (1 - rate);
}
