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
 *
 * ## Order of operations, and why nothing is applied twice
 *
 * Four quantities touch a balance, in this order, each exactly once:
 *
 *   1. **FX** (`lib/fx.ts`) — a *unit* conversion, applied upstream to the
 *      opening balance and to any budget row denominated in another currency.
 *      By the time a figure reaches this file, both cities are already in one
 *      common unit (the display currency) at market rates.
 *   2. **Market return** (`lib/market-data.ts`) — grows the balance during the
 *      simulation. Nominal, and each city compounds at its own market's rate.
 *   3. **Inflation** (`lib/simulation.ts`) — re-prices the expense basket over
 *      *time*. Dividing the balance by the cumulative basket multiplier gives
 *      the *real* balance: the same money stated in that city's month-0 prices.
 *   4. **PPP** — here, and only here. Removes the *cross-country* price gap
 *      that FX leaves behind, because market rates do not equalise what money
 *      buys locally.
 *
 * Steps 3 and 4 are orthogonal and compose safely: one deflates across time
 * within a single country, the other across countries at a single moment. FX
 * and PPP look similar but are not substitutes, and combining them into a
 * single multiplier is the classic bug in this kind of calculator — it would
 * charge the cost difference twice, once through the exchange rate and again
 * through the price level.
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
 * Equivalent to `toInternationalDollars` followed by a re-basing onto A's price
 * level; expressed as one ratio so the PPP adjustment is unmistakably applied
 * once. Never applied to the *expense* side, which `colIndex` already prices.
 */
export function toBaselineBuyingPower(
  nominalSavings: number,
  locationPpp: number,
  baselinePpp: number
): number {
  if (locationPpp <= 0) return nominalSavings;
  return nominalSavings * (baselinePpp / locationPpp);
}

/**
 * Restate an amount held in a country with price level `ppp` as international
 * dollars — US-equivalent buying power, the unit that makes two countries
 * directly comparable.
 *
 * A balance already converted to a common currency at market rates still is not
 * comparable across borders, because the same nominal sum buys more in a
 * cheaper country. Dividing by the price level is what closes that gap: at
 * `ppp = 0.25`, a sum stretches four times as far as it would in the US.
 *
 * This is the only place the price level touches a balance. Subtracting two
 * balances that have each been through it is a like-for-like comparison;
 * subtracting them before it is the defect this function exists to fix.
 */
export function toInternationalDollars(amount: number, ppp: number): number {
  return ppp > 0 ? amount / ppp : amount;
}
