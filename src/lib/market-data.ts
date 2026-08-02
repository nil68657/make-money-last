/**
 * Expected long-run equity market returns, by country.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * When you relocate, the money you invest generally ends up in the destination
 * economy — a US 401(k) and an Indian SIP are not the same asset. Growing every
 * balance at one hard-coded rate quietly assumes they are. So the simulator
 * pre-fills the return from the *destination country's* broad equity market,
 * and lets the user overwrite it.
 *
 * ---------------------------------------------------------------------------
 * FOUR NUMBERS THAT MUST NOT BE CONFLATED
 * ---------------------------------------------------------------------------
 *   nominalReturn  what the index returns in its own currency, before
 *                  inflation. What this table holds.
 *   inflation      what local prices do (`cities.ts`). Erodes the nominal
 *                  return, and separately re-prices the budget.
 *   ppp            country price level vs the US. A cross-sectional
 *                  comparison of price *levels*, not a rate of change.
 *   FX             unit conversion between currencies (`fx.ts`).
 *
 * A 12% nominal return under 6% inflation is not twice as good as 6% under 2%.
 * Real return is the honest comparison, and it is derived here — never stored —
 * so the two can never drift apart. See `realReturn`.
 *
 * ---------------------------------------------------------------------------
 * SOURCES
 * ---------------------------------------------------------------------------
 * The cross-country backbone is the **UBS Global Investment Returns Yearbook
 * 2024** (Dimson, Marsh & Staunton, London Business School), which measures
 * 1900–2023 *real* annualised equity returns on a consistent basis for 21
 * markets — the only widely cited dataset that survives survivorship bias by
 * including markets that went to zero. DMS real returns were combined with this
 * app's own long-run inflation assumption for each country and rounded to the
 * nearest half point, which is the honest precision for a century-long average.
 *
 * Supporting sources for individual markets:
 *   - US: Damodaran (NYU Stern), "Annual Returns on Stock, T.Bonds and T.Bills
 *     1928–current" — S&P 500 total return averages ~10% nominal since 1928.
 *   - India: NSE Nifty 50 TRI since its 1996 base; ~12–13% nominal, on a much
 *     shorter and therefore weaker record than the DMS markets.
 *   - Germany: DAX is a total-return index by construction, so its headline
 *     figure runs above price-only indices; the post-1950 series is used, as
 *     the pre-war German record includes two total wipeouts.
 *   - China: MSCI China / CSI 300. Notoriously decoupled from GDP growth;
 *     realised equity returns have been poor despite rapid output growth.
 *
 * These are century-scale averages, not forecasts. No one earns the average in
 * any given decade, and a 30-year retirement horizon has enormous variance
 * around it. They exist to give a defensible default, and the UI must always
 * let the user replace them.
 */

export interface MarketAssumption {
  /** Long-run nominal annual total return on broad local equities, percent. */
  nominalReturn: number;
  /** The index the figure is anchored to, named so the user can judge it. */
  index: string;
}

/**
 * Keyed by ISO 3166-1 alpha-2, matching `CityRecord.countryCode`. Countries
 * absent from this table fall back to the global blend below, which is the
 * right answer for a small market where a local-index assumption would be
 * spurious precision.
 */
export const MARKET_RETURNS: Record<string, MarketAssumption> = {
  // ---- Developed, long DMS history ----
  US: { nominalReturn: 10, index: "S&P 500" },
  CA: { nominalReturn: 8, index: "S&P/TSX Composite" },
  GB: { nominalReturn: 8, index: "FTSE All-Share" },
  IE: { nominalReturn: 7, index: "ISEQ / MSCI Ireland" },
  DE: { nominalReturn: 7.5, index: "DAX (total return)" },
  FR: { nominalReturn: 6.5, index: "CAC 40" },
  NL: { nominalReturn: 7.5, index: "AEX" },
  BE: { nominalReturn: 6.5, index: "BEL 20" },
  CH: { nominalReturn: 6, index: "SMI" },
  AT: { nominalReturn: 6, index: "ATX" },
  IT: { nominalReturn: 6, index: "FTSE MIB" },
  ES: { nominalReturn: 6.5, index: "IBEX 35" },
  PT: { nominalReturn: 6, index: "PSI 20" },
  SE: { nominalReturn: 8.5, index: "OMX Stockholm 30" },
  NO: { nominalReturn: 7.5, index: "OSEBX" },
  DK: { nominalReturn: 8, index: "OMX Copenhagen 25" },
  FI: { nominalReturn: 7.5, index: "OMX Helsinki 25" },
  IS: { nominalReturn: 7.5, index: "OMX Iceland" },
  JP: { nominalReturn: 5.5, index: "TOPIX" },
  AU: { nominalReturn: 9, index: "S&P/ASX 200" },
  NZ: { nominalReturn: 8, index: "S&P/NZX 50" },

  // ---- Asia ----
  IN: { nominalReturn: 12, index: "Nifty 50 TRI" },
  CN: { nominalReturn: 5, index: "CSI 300" },
  HK: { nominalReturn: 7, index: "Hang Seng" },
  TW: { nominalReturn: 8.5, index: "TAIEX" },
  KR: { nominalReturn: 7.5, index: "KOSPI" },
  SG: { nominalReturn: 7, index: "Straits Times Index" },
  MY: { nominalReturn: 6.5, index: "FTSE Bursa Malaysia KLCI" },
  TH: { nominalReturn: 7, index: "SET Index" },
  ID: { nominalReturn: 10, index: "IDX Composite" },
  PH: { nominalReturn: 8.5, index: "PSEi" },
  VN: { nominalReturn: 10, index: "VN-Index" },
  BD: { nominalReturn: 9, index: "DSEX" },
  PK: { nominalReturn: 12, index: "KSE 100" },
  LK: { nominalReturn: 10, index: "CSE All-Share" },
  NP: { nominalReturn: 9, index: "NEPSE" },
  KH: { nominalReturn: 8, index: "CSX" },

  // ---- Middle East ----
  IL: { nominalReturn: 8, index: "TA-125" },
  AE: { nominalReturn: 7, index: "ADX / DFM General" },
  SA: { nominalReturn: 7.5, index: "Tadawul All Share" },
  QA: { nominalReturn: 6.5, index: "QE Index" },
  KW: { nominalReturn: 6.5, index: "Boursa Kuwait All Share" },
  BH: { nominalReturn: 6, index: "Bahrain All Share" },
  OM: { nominalReturn: 6, index: "MSX 30" },
  JO: { nominalReturn: 6.5, index: "ASE Index" },
  TR: { nominalReturn: 25, index: "BIST 100" },
  LB: { nominalReturn: 12, index: "Blom Stock Index" },

  // ---- Africa ----
  ZA: { nominalReturn: 12, index: "FTSE/JSE All Share" },
  EG: { nominalReturn: 18, index: "EGX 30" },
  NG: { nominalReturn: 18, index: "NGX All-Share" },
  KE: { nominalReturn: 10, index: "NSE 20" },
  GH: { nominalReturn: 15, index: "GSE Composite" },
  MA: { nominalReturn: 7.5, index: "MASI" },
  TN: { nominalReturn: 7.5, index: "Tunindex" },
  ET: { nominalReturn: 12, index: "no liquid equity market — proxy" },
  RW: { nominalReturn: 10, index: "Rwanda SE — proxy" },
  SN: { nominalReturn: 7, index: "BRVM Composite" },
  CI: { nominalReturn: 7, index: "BRVM Composite" },

  // ---- Latin America ----
  MX: { nominalReturn: 9.5, index: "S&P/BMV IPC" },
  BR: { nominalReturn: 13, index: "Ibovespa" },
  AR: { nominalReturn: 45, index: "S&P Merval" },
  CL: { nominalReturn: 8.5, index: "S&P IPSA" },
  CO: { nominalReturn: 9.5, index: "MSCI COLCAP" },
  PE: { nominalReturn: 9, index: "S&P/BVL Peru General" },
  UY: { nominalReturn: 9, index: "no liquid equity market — proxy" },
  CR: { nominalReturn: 8, index: "no liquid equity market — proxy" },
  GT: { nominalReturn: 8, index: "no liquid equity market — proxy" },
  PA: { nominalReturn: 7.5, index: "no liquid equity market — proxy" },
  EC: { nominalReturn: 7.5, index: "no liquid equity market — proxy" },

  // ---- Central & Eastern Europe ----
  PL: { nominalReturn: 8, index: "WIG20" },
  CZ: { nominalReturn: 7.5, index: "PX Index" },
  HU: { nominalReturn: 9, index: "BUX" },
  RO: { nominalReturn: 9, index: "BET" },
  BG: { nominalReturn: 7.5, index: "SOFIX" },
  RS: { nominalReturn: 8, index: "BELEX15" },
  GR: { nominalReturn: 6.5, index: "Athex Composite" },
};

/**
 * Used where no local figure is defensible. A global all-country blend is a
 * more honest default for a small or illiquid market than inventing a local
 * index return — most people in those markets hold global funds anyway.
 */
export const GLOBAL_MARKET: MarketAssumption = {
  nominalReturn: 7.5,
  index: "MSCI ACWI (global blend)",
};

export function marketReturnFor(countryCode: string): MarketAssumption {
  return MARKET_RETURNS[countryCode?.toUpperCase()] ?? GLOBAL_MARKET;
}

/**
 * Fisher, not subtraction. At the inflation rates in this dataset the gap
 * matters: 12% nominal under 6% inflation is 5.66% real, not 6%. Subtracting
 * would flatter every high-inflation economy in the table, which is exactly
 * the comparison the user is trying to make.
 *
 *   1 + real = (1 + nominal) / (1 + inflation)
 */
export function realReturn(nominalPercent: number, inflationPercent: number): number {
  const nominal = Number.isFinite(nominalPercent) ? nominalPercent : 0;
  const inflation = Number.isFinite(inflationPercent) ? inflationPercent : 0;
  return ((1 + nominal / 100) / (1 + inflation / 100) - 1) * 100;
}

/**
 * The rate actually applied to a balance, once the share held as cash is taken
 * into account. Cash earns nothing here — deliberately, because the point of
 * the input is to stop someone sitting on cash from being modelled as if they
 * held equities.
 */
export function blendedReturn(
  nominalPercent: number,
  investedPercent: number
): number {
  const invested = Math.min(100, Math.max(0, investedPercent)) / 100;
  return (Number.isFinite(nominalPercent) ? nominalPercent : 0) * invested;
}
