/**
 * Foreign exchange.
 *
 * ---------------------------------------------------------------------------
 * FX IS NOT PPP
 * ---------------------------------------------------------------------------
 * This module does exactly one thing: convert a nominal amount of money from
 * one currency unit into another. That is all an exchange rate is — a unit
 * conversion, like inches to centimetres.
 *
 * It is deliberately kept apart from the two price-level multipliers:
 *
 *   FX (here)          what your money *exchanges for*. ¥1,000,000 is $6,600.
 *   ppp (cities.ts)    what your money *buys locally*, versus the US.
 *   colIndex           what this city's basket costs, versus the US average.
 *
 * Collapsing FX into either of the other two is the classic error in this kind
 * of calculator: it double-counts, because a cheap country is usually cheap
 * *after* you have already converted at the market rate. Converting ¥ to $ and
 * then also scaling by Japan's price level would understate Japanese costs
 * twice over. So: FX moves between units, `ppp` and `colIndex` move between
 * price levels, and nothing in this file touches either of them.
 *
 * ---------------------------------------------------------------------------
 * RATES
 * ---------------------------------------------------------------------------
 * Live rates come from open.er-api.com, which needs no API key. They are
 * cached in localStorage for `CACHE_TTL_MS` so a session never re-fetches, and
 * the network is never touched on a keystroke or a render.
 *
 * When the fetch fails — offline, rate-limited, blocked — the bundled snapshot
 * below is used instead and the UI says so. A failed fetch must never block a
 * projection, so the app always *starts* from this table and only upgrades to
 * live rates once they arrive. That also keeps server and client render
 * identical, so there is no hydration mismatch.
 */

export type FxSource = "live" | "cache" | "fallback";

export interface FxSnapshot {
  /** Everything is quoted as units of the currency per 1 unit of base. */
  base: string;
  rates: Record<string, number>;
  /** ISO-8601 instant the rates were published (or the snapshot was taken). */
  asOf: string;
  source: FxSource;
}

/**
 * Bundled offline snapshot: units per 1 USD, mid-market, rounded, taken as a
 * 2024–2025 reference. Approximate by design — it exists so the app still
 * works with no network, not to be traded on. Covers every currency used by
 * `src/lib/cities.ts`.
 */
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 151,
  CNY: 7.24,
  INR: 83.5,
  CAD: 1.36,
  AUD: 1.52,
  NZD: 1.64,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.87,
  ISK: 138,
  PLN: 3.95,
  CZK: 23.2,
  HUF: 360,
  RON: 4.58,
  BGN: 1.8,
  RSD: 108,
  TRY: 32.5,
  ILS: 3.7,
  AED: 3.6725,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.307,
  BHD: 0.376,
  OMR: 0.3845,
  JOD: 0.709,
  LBP: 89500,
  EGP: 47.5,
  MAD: 9.95,
  TND: 3.12,
  ZAR: 18.6,
  NGN: 1450,
  GHS: 14.5,
  KES: 130,
  ETB: 57,
  RWF: 1300,
  XOF: 603,
  MXN: 17,
  BRL: 5.05,
  ARS: 870,
  CLP: 950,
  COP: 3900,
  PEN: 3.75,
  UYU: 39,
  CRC: 510,
  GTQ: 7.8,
  HKD: 7.82,
  TWD: 32.2,
  KRW: 1340,
  SGD: 1.35,
  MYR: 4.72,
  THB: 36,
  IDR: 15800,
  PHP: 56.5,
  VND: 24800,
  KHR: 4100,
  BDT: 110,
  PKR: 278,
  LKR: 300,
  NPR: 133,
};

export const FALLBACK_FX: FxSnapshot = {
  base: "USD",
  rates: FALLBACK_RATES,
  asOf: "2025-01-01T00:00:00.000Z",
  source: "fallback",
};

const ENDPOINT = "https://open.er-api.com/v6/latest/USD";
const CACHE_KEY = "mml-fx-cache";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 6000;

/** Units of `currency` per 1 unit of the snapshot base. */
export function rateOf(currency: string, fx: FxSnapshot): number | null {
  const rate = fx.rates[currency?.toUpperCase()];
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function hasRate(currency: string, fx: FxSnapshot): boolean {
  return rateOf(currency, fx) !== null;
}

/**
 * Multiplier taking an amount denominated in `from` to one denominated in
 * `to`. Falls back to 1 when either side is unknown, so an unmapped currency
 * degrades to "shown as-is" rather than to zero or NaN.
 */
export function fxRate(from: string, to: string, fx: FxSnapshot): number {
  if (!from || !to || from.toUpperCase() === to.toUpperCase()) return 1;
  const fromRate = rateOf(from, fx);
  const toRate = rateOf(to, fx);
  if (fromRate === null || toRate === null) return 1;
  return toRate / fromRate;
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  fx: FxSnapshot
): number {
  if (!Number.isFinite(amount)) return 0;
  return amount * fxRate(from, to, fx);
}

/**
 * Convert an amount the user typed into another currency, rounded to three
 * significant figures. An exact conversion of a round number is never itself
 * round — ¥22,650,000 reads as a considered figure, ¥22,648,317 reads as
 * noise — and these are all estimates the user is expected to edit anyway.
 */
export function convertForEntry(
  amount: number,
  from: string,
  to: string,
  fx: FxSnapshot
): number {
  const converted = convertAmount(amount, from, to, fx);
  if (!Number.isFinite(converted) || converted === 0) return 0;
  const magnitude = Math.pow(
    10,
    Math.max(0, Math.floor(Math.log10(Math.abs(converted))) - 2)
  );
  return Math.round(converted / magnitude) * magnitude;
}

interface CachedFx {
  asOf: string;
  fetchedAt: number;
  rates: Record<string, number>;
}

export function readCachedFx(): FxSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFx;
    if (!parsed?.rates || typeof parsed.fetchedAt !== "number") return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    if (!Number.isFinite(parsed.rates.USD)) return null;
    return {
      base: "USD",
      rates: parsed.rates,
      asOf: parsed.asOf,
      source: "cache",
    };
  } catch {
    return null;
  }
}

function writeCachedFx(snapshot: FxSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedFx = {
      asOf: snapshot.asOf,
      fetchedAt: Date.now(),
      rates: snapshot.rates,
    };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage blocked or full: rates just won't survive the reload.
  }
}

/** De-duplicates concurrent callers within a page session. */
let inFlight: Promise<FxSnapshot> | null = null;

/**
 * Resolves to the best rates available. Never rejects: any failure resolves to
 * the bundled snapshot, because a projection must not depend on the network.
 */
export function loadFxSnapshot(): Promise<FxSnapshot> {
  const cached = readCachedFx();
  if (cached) return Promise.resolve(cached);
  if (inFlight) return inFlight;

  inFlight = fetchLive()
    .then((snapshot) => {
      if (snapshot) {
        writeCachedFx(snapshot);
        return snapshot;
      }
      return FALLBACK_FX;
    })
    .catch(() => FALLBACK_FX)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

async function fetchLive(): Promise<FxSnapshot | null> {
  if (typeof fetch !== "function") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;

    const body = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_unix?: number;
    };
    if (body?.result !== "success" || !body.rates) return null;
    if (!Number.isFinite(body.rates.USD)) return null;

    return {
      base: "USD",
      rates: body.rates,
      asOf: body.time_last_update_unix
        ? new Date(body.time_last_update_unix * 1000).toISOString()
        : new Date().toISOString(),
      source: "live",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** "2 Aug 2026, 04:15 UTC" — short, unambiguous, timezone-explicit. */
export function formatRatesAsOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })}, ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
}
