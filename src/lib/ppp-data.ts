/**
 * Purchasing-power helpers.
 *
 * The per-country PPP table that used to live here has been folded into the
 * city dataset (`src/lib/cities.ts`), where every record carries a `ppp` price
 * level ratio alongside its cost-of-living index. This file keeps only the math
 * so there is a single source of truth for the underlying figures.
 *
 * `ppp` is a **price level ratio vs the United States** (US = 1.00): roughly
 * what one US dollar of goods costs locally at market exchange rates. It is a
 * country-level figure. The city-level `colIndex` is what drives the budget;
 * `ppp` is used for the "international dollars" lens, which answers a different
 * question — what a held balance is worth in globally comparable terms.
 */

export function getEffectivePpp(
  pppIndex: number,
  useManual: boolean,
  manualRatio: number
): number {
  const value = useManual ? manualRatio : pppIndex;
  return Number.isFinite(value) && value > 0 ? value : 1;
}

/**
 * Restate an amount held in one price environment as the equivalent amount in
 * the baseline (City A) price environment. A balance sitting in a cheaper
 * country commands more real goods, so it scales up.
 *
 * This is deliberately *not* applied to the savings trajectory: expenses are
 * already re-priced per city in the display currency, so applying it again
 * would double-count. It is used only for the standalone international-dollars
 * comparison in the cost-of-living summary.
 */
export function toBaselineBuyingPower(
  nominalSavings: number,
  locationPpp: number,
  baselinePpp: number
): number {
  if (locationPpp <= 0) return nominalSavings;
  return nominalSavings * (baselinePpp / locationPpp);
}
