import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * ISO 4217 currencies with no minor unit. ¥1,234 is a whole amount — writing
 * "¥1,234.00" is simply wrong, and a "0.5" of one is not a thing.
 */
export const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function isZeroDecimalCurrency(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currency?.toUpperCase());
}

/**
 * The UI is in English, so en-US is the default. INR is the exception worth
 * making: Indian digit grouping is lakh/crore (₹1,23,45,678), and en-US would
 * render it with thousands groups, which reads as wrong to anyone from the 17
 * Indian cities in the dataset.
 */
const CURRENCY_LOCALE: Record<string, string> = {
  INR: "en-IN",
};

function localeFor(currency: string): string {
  return CURRENCY_LOCALE[currency?.toUpperCase()] ?? "en-US";
}

/**
 * Whole-unit currency. `minimumFractionDigits` is pinned to 0 alongside the
 * maximum: leaving it to default means it inherits the currency's minor-unit
 * count (2 for USD), and a minimum above the maximum makes Intl throw.
 */
export function formatCurrency(
  value: number,
  currency = "USD",
  compact = false
): string {
  const safe = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(localeFor(currency), {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      minimumFractionDigits: 0,
      maximumFractionDigits: compact ? 1 : 0,
    }).format(safe);
  } catch {
    return `${currency} ${safe.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
}

/** Currency with an explicit +/- sign, for deltas. */
export function formatSignedCurrency(
  value: number,
  currency = "USD",
  compact = false
): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatCurrency(Math.abs(value), currency, compact)}`;
}

export function currencySymbol(currency = "USD"): string {
  try {
    const parts = new Intl.NumberFormat(localeFor(currency), {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function formatSignedPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

/** "4 yrs 3 mos", or "4 years 3 months" in long form. */
export function formatMonths(months: number | null, longForm = false): string {
  if (months === null) return "Never";
  const total = Math.max(0, Math.round(months));
  const years = Math.floor(total / 12);
  const rem = total % 12;

  const yearWord = longForm
    ? years === 1
      ? "year"
      : "years"
    : years === 1
      ? "yr"
      : "yrs";
  const monthWord = longForm
    ? rem === 1
      ? "month"
      : "months"
    : rem === 1
      ? "mo"
      : "mos";

  if (total === 0) return longForm ? "0 months" : "0 mos";
  if (years === 0) return `${rem} ${monthWord}`;
  if (rem === 0) return `${years} ${yearWord}`;
  return `${years} ${yearWord} ${rem} ${monthWord}`;
}

/** Splits a runway into parts so the results hero can style them separately. */
export function monthsToParts(months: number | null): {
  years: number;
  months: number;
} | null {
  if (months === null) return null;
  const total = Math.max(0, Math.round(months));
  return { years: Math.floor(total / 12), months: total % 12 };
}

/**
 * ISO 3166-1 alpha-2 to regional-indicator flag emoji. "US" -> 🇺🇸
 * Falls back to a globe when the code is malformed.
 */
export function flagEmoji(countryCode: string): string {
  const code = countryCode?.trim().toUpperCase();
  if (!code || code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return "🌐";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + code.charCodeAt(0) - 65,
    base + code.charCodeAt(1) - 65
  );
}

export function parseNumberInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Groups digits while typing in a money field: "1234567" -> "1,234,567". */
export function formatWithCommas(value: number | string): string {
  const num = typeof value === "string" ? parseNumberInput(value) : value;
  if (!Number.isFinite(num) || num === 0) return "";
  return Math.round(num).toLocaleString("en-US");
}
