/**
 * Throwaway sanity harness for the simulation model and the city search.
 * Run with: npx tsx scripts/verify-model.ts
 */
import { CITIES, DATASET_CURRENCIES, DEFAULT_CITY_A_ID, DEFAULT_CITY_B_ID, cityCurrency, getCityById, searchCities } from "../src/lib/cities";
import { buildLocationProfile, deriveExpenses, equivalentIncome, retargetLocationProfile } from "../src/lib/cost-model";
import { blendedReturn, GLOBAL_MARKET, MARKET_RETURNS, marketReturnFor, realReturn } from "../src/lib/market-data";
import { runComparison, sumExpenses, formatDateInput } from "../src/lib/simulation";
import { DEFAULT_ASSUMPTIONS, type SimulationInputs } from "../src/lib/types";
import { fold } from "../src/lib/text";
import { cityLabel } from "../src/lib/cost-model";
import { flagEmoji, formatCurrency, formatMonths, isZeroDecimalCurrency } from "../src/lib/format";
import { convertAmount, convertForEntry, FALLBACK_FX, FALLBACK_RATES, fxRate, hasRate } from "../src/lib/fx";

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  if (!condition) failures++;
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// ---------------------------------------------------------------- dataset
const ids = new Set(CITIES.map((c) => c.id));
check("unique ids", ids.size === CITIES.length, `${CITIES.length} rows, ${ids.size} unique`);
check("dataset size 220-280", CITIES.length >= 220 && CITIES.length <= 280, `${CITIES.length}`);
check(
  "all fields sane",
  CITIES.every(
    (c) =>
      c.city && c.country && /^[A-Z]{2}$/.test(c.countryCode) && /^[A-Z]{3}$/.test(c.currency) &&
      c.colIndex > 5 && c.colIndex < 400 && c.ppp > 0 && c.ppp < 3 && c.inflation >= 0
  )
);
const usPpp = CITIES.filter((c) => c.countryCode === "US");
check("US cities have ppp 1.0", usPpp.every((c) => c.ppp === 1), `${usPpp.length} US cities`);

const countries = new Set(CITIES.map((c) => c.countryCode));
console.log(`      ${CITIES.length} cities across ${countries.size} countries`);

// per-country consistency of country-level figures
const byCountry = new Map<string, Set<number>>();
for (const c of CITIES) {
  if (!byCountry.has(c.countryCode)) byCountry.set(c.countryCode, new Set());
  byCountry.get(c.countryCode)!.add(c.ppp);
}
const inconsistent = [...byCountry.entries()].filter(([, set]) => set.size > 1);
check("ppp consistent within country", inconsistent.length === 0, inconsistent.map(([c]) => c).join(",") || "");

// ----------------------------------------------------------------- search
check("empty query returns popular", searchCities("").length > 0, `${searchCities("").length}`);
check("substring match: 'lisb' -> Lisbon", searchCities("lisb")[0]?.city === "Lisbon");
check("alias match: 'bengaluru' -> Bangalore", searchCities("bengaluru")[0]?.city === "Bangalore");
check("alias match: 'bombay' -> Mumbai", searchCities("bombay")[0]?.city === "Mumbai");
check(
  "diacritics: 'zurich' -> Zürich",
  fold(searchCities("zurich")[0]?.city ?? "") === "zurich",
  searchCities("zurich")[0]?.city
);
check("diacritics: 'sao paulo' finds it", searchCities("sao paulo").length > 0, searchCities("sao paulo")[0]?.city);
check("country match: 'portugal'", searchCities("portugal").every((c) => c.country === "Portugal"));
check("state match: 'TX' returns Texas cities", searchCities("TX").some((c) => c.region === "TX"));
check("limit respected", searchCities("a", 5).length <= 5);
check("no match returns empty", searchCities("zzzzqqqq").length === 0);
check("deterministic", JSON.stringify(searchCities("san")) === JSON.stringify(searchCities("san")));

// ------------------------------------------------------------- cost model
const ny = getCityById(DEFAULT_CITY_A_ID)!;
const lisbon = getCityById(DEFAULT_CITY_B_ID)!;
check("default cities resolve", Boolean(ny && lisbon), `${ny?.city} / ${lisbon?.city}`);

const nyExpenses = deriveExpenses(150_000, ny.colIndex);
const lisbonExpenses = deriveExpenses(150_000, lisbon.colIndex);
console.log("\n  NY budget    ", nyExpenses, "total", Math.round(sumExpenses(nyExpenses)));
console.log("  Lisbon budget", lisbonExpenses, "total", Math.round(sumExpenses(lisbonExpenses)));

check("cheaper city -> cheaper basket", sumExpenses(lisbonExpenses) < sumExpenses(nyExpenses));
check("housing dominates the gap", nyExpenses.rent / lisbonExpenses.rent > nyExpenses.food / lisbonExpenses.food);
check("zero income -> zero budget", sumExpenses(deriveExpenses(0, 168)) === 0);
check(
  "equivalent income scales by index",
  equivalentIncome(150_000, ny.colIndex, lisbon.colIndex) ===
    Math.round(150_000 * (lisbon.colIndex / ny.colIndex))
);

// ------------------------------------------------------------- simulation
function makeInputs(savings: number, income: number, months = 360): SimulationInputs {
  return {
    asOfDate: formatDateInput(new Date()),
    displayCurrency: lisbon.currency,
    currentSavings: savings,
    savingsConversion: {
      enteredAmount: savings,
      enteredCurrency: lisbon.currency,
      rate: 1,
      ratesAsOf: FALLBACK_FX.asOf,
      ratesSource: "fallback",
    },
    projectionMonths: months,
    locationA: buildLocationProfile(ny, income),
    locationB: buildLocationProfile(lisbon, income),
    assumptions: DEFAULT_ASSUMPTIONS,
  };
}

const base = makeInputs(250_000, 150_000);
const r = runComparison(base);

console.log("\n  --- NY -> Lisbon, $250k savings, $150k income, 30y ---");
for (const side of [r.locationA, r.locationB]) {
  console.log(
    `  ${side.locationName.padEnd(14)} spend ${Math.round(side.monthlyExpenses).toString().padStart(6)}` +
      ` net ${Math.round(side.monthlyNet).toString().padStart(7)}` +
      ` rate ${side.savingsRate.toFixed(1).padStart(6)}%` +
      ` runway ${String(side.runwayMonths).padStart(5)}mo` +
      ` final ${Math.round(side.finalSavings).toString().padStart(10)}` +
      ` real ${Math.round(side.finalPppSavings).toString().padStart(10)}`
  );
}
console.log(`  COL delta ${r.costOfLivingDeltaPercent.toFixed(1)}%  equiv income ${r.equivalentIncomeInB}  runway delta ${r.runwayDifferenceMonths}`);

check("trajectory length = months + 1", r.locationA.trajectory.length === 361);
check("month 0 balance = starting savings", r.locationA.trajectory[0].savings === 250_000);
check("Lisbon has better cashflow", r.locationB.monthlyNet > r.locationA.monthlyNet);
check("Lisbon cheaper", r.costOfLivingDeltaPercent < 0);
check("real <= nominal at the end (inflation erodes)", r.locationB.finalPppSavings < r.locationB.finalSavings);
check("month-0 real == nominal", Math.abs(r.locationB.trajectory[0].pppAdjustedSavings - 250_000) < 1);
check("categories cover all six", r.categories.length === 6);
check("runway delta favours Lisbon", (r.runwayDifferenceMonths ?? 0) > 0);

// runway must be monotone in starting savings
const runways = [50_000, 100_000, 250_000, 500_000].map((s) => {
  const sim = runComparison(makeInputs(s, 150_000));
  return sim.locationA.runwayMonths ?? 9999;
});
console.log("  NY runway by savings [50k,100k,250k,500k] =", runways);
check("more savings -> longer runway", runways.every((v, i) => i === 0 || v >= runways[i - 1]));

// depletion must actually cross zero
const depleting = runComparison(makeInputs(60_000, 150_000));
const rw = depleting.locationA.runwayMonths;
if (rw !== null) {
  const t = depleting.locationA.trajectory;
  check("balance positive before depletion", t[rw - 1].savings > 0, `${Math.round(t[rw - 1].savings)}`);
  check("balance non-positive at depletion", t[rw].savings <= 0, `${Math.round(t[rw].savings)}`);
  check(
    "exact runway brackets the integer month",
    depleting.locationA.runwayMonthsExact !== null &&
      depleting.locationA.runwayMonthsExact > rw - 1 &&
      depleting.locationA.runwayMonthsExact <= rw,
    `${depleting.locationA.runwayMonthsExact?.toFixed(2)} vs ${rw}`
  );
}

// zero-income edge case must not explode
const broke = runComparison(makeInputs(100_000, 0));
check("zero income does not NaN", Number.isFinite(broke.locationA.finalSavings));
check("zero income, zero budget -> never depletes", broke.locationA.runwayMonths === null);

// balance must never go negative, and high inflation must stay finite
check(
  "balance never negative (NY depletes)",
  r.locationA.trajectory.every((t) => t.savings >= 0),
  `min ${Math.min(...r.locationA.trajectory.map((t) => t.savings))}`
);
check("depleted balance stays at zero", r.locationA.finalSavings === 0);

const istanbul = CITIES.find((c) => c.city === "Istanbul");
if (istanbul) {
  const hi = runComparison({ ...base, locationB: buildLocationProfile(istanbul, 150_000) });
  const last = hi.locationB.trajectory[hi.locationB.trajectory.length - 1];
  check("high-inflation city stays finite", Number.isFinite(hi.locationB.finalSavings), `${Math.round(hi.locationB.finalSavings)}`);
  check("high-inflation balance never negative", hi.locationB.trajectory.every((t) => t.savings >= 0));
  check("high inflation blows up the price level", last.inflationMultiplier > 100, `${Math.round(last.inflationMultiplier)}x`);
}

// ------------------------------------------------------------- formatMonths
const durations: [number | null, boolean, string][] = [
  [null, false, "Never"],
  [0, false, "0 mos"],
  [1, false, "1 mo"],
  [3, false, "3 mos"],
  [12, false, "1 yr"],
  [24, false, "2 yrs"],
  [13, false, "1 yr 1 mo"],
  [14, false, "1 yr 2 mos"],
  [51, false, "4 yrs 3 mos"],
  [13, true, "1 year 1 month"],
  [51, true, "4 years 3 months"],
  [12, true, "1 year"],
];
for (const [input, long, expected] of durations) {
  const actual = formatMonths(input, long);
  check(`formatMonths(${input}, ${long}) === "${expected}"`, actual === expected, actual);
}

// ------------------------------------------------------------------ labels
check("region omitted when it repeats city", cityLabel(lisbon) === "Lisbon", cityLabel(lisbon));
const tokyo = CITIES.find((c) => c.city === "Tokyo");
if (tokyo) check("Tokyo label is not 'Tokyo, Tokyo'", cityLabel(tokyo) === "Tokyo", cityLabel(tokyo));
check("US city keeps its state", cityLabel(ny) === "New York, NY", cityLabel(ny));
const dupLabels = CITIES.filter((c) => {
  const parts = cityLabel(c).split(", ");
  return parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase();
});
check("no duplicated labels anywhere", dupLabels.length === 0, `${dupLabels.length} offenders`);

// ------------------------------------------------------------------- flags
check("flag: US", flagEmoji("US") === "🇺🇸", flagEmoji("US"));
check("flag: IN", flagEmoji("IN") === "🇮🇳", flagEmoji("IN"));
check("flag: bad input falls back", flagEmoji("") === "🌐" && flagEmoji("XYZ") === "🌐");
check(
  "every city renders a real flag",
  CITIES.every((c) => flagEmoji(c.countryCode) !== "🌐"),
  CITIES.filter((c) => flagEmoji(c.countryCode) === "🌐").map((c) => c.countryCode).join(",")
);

// ---------------------------------------------------------------------- FX
check(
  "every dataset currency has a fallback rate",
  DATASET_CURRENCIES.every((code) => hasRate(code, FALLBACK_FX)),
  DATASET_CURRENCIES.filter((code) => !hasRate(code, FALLBACK_FX)).join(",") || `${DATASET_CURRENCIES.length} codes`
);
check("fallback rates are all positive", Object.values(FALLBACK_RATES).every((r) => r > 0));
check("USD is the base", FALLBACK_RATES.USD === 1);
check("same-currency rate is exactly 1", fxRate("EUR", "EUR", FALLBACK_FX) === 1);
check(
  "round trip returns the original",
  Math.abs(convertAmount(convertAmount(1000, "USD", "JPY", FALLBACK_FX), "JPY", "USD", FALLBACK_FX) - 1000) < 1e-6
);
check(
  "cross rate goes through the base",
  Math.abs(fxRate("EUR", "JPY", FALLBACK_FX) - FALLBACK_RATES.JPY / FALLBACK_RATES.EUR) < 1e-9
);
check("unknown currency degrades to 1, not NaN", fxRate("ZZZ", "USD", FALLBACK_FX) === 1);
check("conversion of a non-finite amount is 0", convertAmount(NaN, "USD", "EUR", FALLBACK_FX) === 0);
check(
  "entry conversion rounds to 3 significant figures",
  convertForEntry(150_000, "USD", "JPY", FALLBACK_FX) === 22_700_000,
  `${convertForEntry(150_000, "USD", "JPY", FALLBACK_FX)}`
);

// FX and PPP must stay independent: converting the display currency must not
// move a single real quantity. A model that folded the rate into the price
// level would shift runway here.
// Savings chosen so both sides actually deplete, or the check is vacuous.
const depletingInputs = makeInputs(60_000, 150_000);
const inEuro = runComparison(depletingInputs);
const inYen = runComparison({ ...depletingInputs, displayCurrency: "JPY" });
check(
  "the depleting scenario really depletes",
  inEuro.locationA.runwayMonths !== null,
  `${inEuro.locationA.runwayMonths} months`
);
check(
  "display currency does not touch runway (FX kept out of the model)",
  inEuro.locationA.runwayMonths === inYen.locationA.runwayMonths &&
    inEuro.locationB.runwayMonths === inYen.locationB.runwayMonths,
  `${inEuro.locationA.runwayMonths} vs ${inYen.locationA.runwayMonths}`
);
check(
  "display currency does not touch the cost-of-living delta",
  inEuro.costOfLivingDeltaPercent === inYen.costOfLivingDeltaPercent
);
check(
  "ppp is carried through untouched by FX",
  inYen.locationB.pppIndex === lisbon.ppp,
  `${inYen.locationB.pppIndex} vs ${lisbon.ppp}`
);

// ------------------------------------------------------------ currency data
check(
  "every city exposes an ISO code and a symbol",
  CITIES.every((c) => /^[A-Z]{3}$/.test(cityCurrency(c).code) && cityCurrency(c).symbol.length > 0)
);
check("Tokyo renders the yen sign", cityCurrency(tokyo!).symbol === "¥", cityCurrency(tokyo!).symbol);
check("New York renders the dollar sign", cityCurrency(ny).symbol === "$", cityCurrency(ny).symbol);
check("Lisbon renders the euro sign", cityCurrency(lisbon).symbol === "€", cityCurrency(lisbon).symbol);
check(
  "eurozone cities all share EUR",
  CITIES.filter((c) => ["PT", "DE", "FR", "ES", "IT", "NL", "IE", "AT", "BE", "FI", "GR"].includes(c.countryCode)).every(
    (c) => c.currency === "EUR"
  )
);

check("JPY is zero-decimal", isZeroDecimalCurrency("JPY") && isZeroDecimalCurrency("KRW"));
check("USD is not zero-decimal", !isZeroDecimalCurrency("USD"));
check("JPY formats with no decimals", formatCurrency(1_234_567, "JPY") === "¥1,234,567", formatCurrency(1_234_567, "JPY"));
check("KRW formats with no decimals", formatCurrency(1234.56, "KRW") === "₩1,235", formatCurrency(1234.56, "KRW"));
check("USD still formats as whole dollars", formatCurrency(1234.56, "USD") === "$1,235", formatCurrency(1234.56, "USD"));
check("INR uses lakh grouping", formatCurrency(12_345_678, "INR") === "₹1,23,45,678", formatCurrency(12_345_678, "INR"));
check("compact JPY", formatCurrency(1_234_567, "JPY", true) === "¥1.2M", formatCurrency(1_234_567, "JPY", true));
check(
  "no currency in the dataset throws the formatter",
  DATASET_CURRENCIES.every((code) => {
    const out = formatCurrency(1234, code);
    return typeof out === "string" && out.length > 0 && !out.includes("NaN");
  })
);

// -------------------------------------------------------------- market data
check(
  "every country in the dataset resolves a market return",
  [...countries].every((code) => marketReturnFor(code).nominalReturn > 0)
);
check(
  "market returns are plausible (0-60% nominal)",
  Object.values(MARKET_RETURNS).every((m) => m.nominalReturn > 0 && m.nominalReturn <= 60)
);
check(
  "every market assumption names its index",
  Object.values(MARKET_RETURNS).every((m) => m.index.trim().length > 0)
);
check("US anchors to the S&P 500", marketReturnFor("US").index === "S&P 500");
check("India anchors to the Nifty", /Nifty/.test(marketReturnFor("IN").index));
check(
  "an unknown country falls back to the global blend",
  marketReturnFor("ZZ").nominalReturn === GLOBAL_MARKET.nominalReturn
);

// Fisher, not subtraction. This is the check that stops someone "simplifying"
// real return back to nominal minus inflation.
check(
  "real return uses Fisher, not subtraction",
  Math.abs(realReturn(12, 6) - 5.660377) < 1e-4,
  `${realReturn(12, 6).toFixed(4)}% (naive subtraction would say 6%)`
);
check("zero inflation leaves the nominal return alone", Math.abs(realReturn(8, 0) - 8) < 1e-9);
check(
  "inflation above the nominal return goes negative",
  realReturn(5, 9) < 0,
  `${realReturn(5, 9).toFixed(2)}%`
);
check("cash-only portfolio earns nothing", blendedReturn(10, 0) === 0);
check("fully invested earns the whole market return", blendedReturn(10, 100) === 10);
check("half invested earns half", blendedReturn(10, 50) === 5);

// A profile picks up its own country's market, and each side of a comparison
// compounds at its own rate rather than a shared one.
check(
  "a profile adopts its country's market return",
  buildLocationProfile(ny, 150_000).marketReturn === marketReturnFor("US").nominalReturn
);
const bangalore = CITIES.find((c) => c.city === "Bangalore")!;
const inMarkets = runComparison(
  makeInputs(250_000, 150_000)
);
check(
  "the two sides carry different market returns",
  inMarkets.locationA.marketReturn !== inMarkets.locationB.marketReturn,
  `${inMarkets.locationA.locationName} ${inMarkets.locationA.marketReturn}% vs ${inMarkets.locationB.locationName} ${inMarkets.locationB.marketReturn}%`
);
check(
  "India's nominal return beats the US but not after inflation",
  marketReturnFor("IN").nominalReturn > marketReturnFor("US").nominalReturn &&
    realReturn(marketReturnFor("IN").nominalReturn, bangalore.inflation) <
      realReturn(marketReturnFor("US").nominalReturn, ny.inflation),
  `IN ${realReturn(marketReturnFor("IN").nominalReturn, bangalore.inflation).toFixed(2)}% real` +
    ` vs US ${realReturn(marketReturnFor("US").nominalReturn, ny.inflation).toFixed(2)}% real`
);

// Growth must actually reach the balance, and the invested share must gate it.
const investedFully = runComparison({
  ...base,
  assumptions: { ...DEFAULT_ASSUMPTIONS, investedPercentage: 100 },
});
const allCash = runComparison({
  ...base,
  assumptions: { ...DEFAULT_ASSUMPTIONS, investedPercentage: 0 },
});
check(
  "being invested compounds the balance higher than holding cash",
  investedFully.locationB.finalSavings > allCash.locationB.finalSavings * 1.2,
  `${Math.round(investedFully.locationB.finalSavings)} vs ${Math.round(allCash.locationB.finalSavings)}`
);
check(
  "growth lengthens runway rather than being ignored",
  (runComparison({
    ...makeInputs(60_000, 150_000),
    assumptions: { ...DEFAULT_ASSUMPTIONS, investedPercentage: 100 },
  }).locationA.runwayMonths ?? 0) >
    (runComparison({
      ...makeInputs(60_000, 150_000),
      assumptions: { ...DEFAULT_ASSUMPTIONS, investedPercentage: 0 },
    }).locationA.runwayMonths ?? 0)
);
check(
  "the reported effective return matches the blend actually applied",
  Math.abs(
    investedFully.locationB.effectiveReturn -
      blendedReturn(investedFully.locationB.marketReturn, 100)
  ) < 1e-9
);

// The market return is nominal and must not be secretly deflated: changing the
// display currency (an FX operation) must leave it untouched.
check(
  "market return survives a change of display currency",
  inYen.locationB.marketReturn === inEuro.locationB.marketReturn &&
    inYen.locationB.realMarketReturn === inEuro.locationB.realMarketReturn
);
check(
  "a manual return survives a change of city",
  retargetLocationProfile(
    { ...buildLocationProfile(ny, 150_000), marketReturn: 3.5, useManualReturn: true },
    lisbon,
    150_000
  ).marketReturn === 3.5
);
check(
  "an untouched return follows the city",
  retargetLocationProfile(buildLocationProfile(ny, 150_000), lisbon, 150_000)
    .marketReturn === marketReturnFor(lisbon.countryCode).nominalReturn
);

// same city both sides -> identical results
const same = runComparison({ ...base, locationB: buildLocationProfile(ny, 150_000) });
check("identical cities -> identical runway", same.locationA.runwayMonths === same.locationB.runwayMonths);
check("identical cities -> 0% COL delta", Math.abs(same.costOfLivingDeltaPercent) < 0.001);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
