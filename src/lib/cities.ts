import { currencySymbol } from "./format";
import type { CityRecord } from "./types";

/**
 * Reference city dataset for the relocation runway simulator.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS — AND WHAT IT IS NOT
 * ---------------------------------------------------------------------------
 * Every number below is an *approximate reference figure compiled from public
 * sources* — Numbeo-style cost-of-living indices, World Bank ICP price level
 * ratios, and IMF / central-bank headline CPI prints — then rounded and
 * hand-calibrated so the dataset stays internally consistent.
 *
 * This is NOT live data. Nothing here is fetched, refreshed, or reconciled
 * against a provider. It is a hand-maintained snapshot circa 2024–2025, it
 * carries no warranty of accuracy, and it should never be presented to a user
 * as authoritative. Its only job is to give sane starting defaults so the
 * simulator opens with plausible numbers instead of zeros. The user is
 * expected to override anything that matters to their decision, and the UI
 * should make that easy.
 *
 * Individual cities can be off by a wide margin. Cost of living varies far
 * more *within* a metro (neighbourhood, commute, school district) than these
 * single-number indices can express, and fast-moving economies drift out of
 * date quickly. Treat the figures as an order-of-magnitude starting point.
 *
 * ---------------------------------------------------------------------------
 * THE THREE NUMBERS
 * ---------------------------------------------------------------------------
 * `colIndex` — CITY-LEVEL cost-of-living index where **100 = the US national
 *   average**. 150 means a comparable lifestyle costs roughly 50% more than
 *   the US average; 50 means roughly half. Rent is the dominant driver of the
 *   spread, which is why cities inside one country diverge sharply (New York
 *   168 vs Wichita 82) while groceries and services move much less. Calibrated
 *   against anchors such as San Francisco 165, Boston 140, Chicago 108,
 *   Atlanta 100, Cleveland 88, London 128, Zurich 165, Lisbon 72, Bangkok 48,
 *   Mumbai 34, Bangalore 30.
 *
 * `ppp` — COUNTRY-LEVEL price level ratio versus the United States (US = 1.00):
 *   what one US dollar of goods costs locally once converted at *market*
 *   exchange rates. Below 1.00 means the country is cheaper than the US at
 *   prevailing FX, so a dollar of savings buys more there; above 1.00 means it
 *   buys less. This is what makes cross-border buying power comparable, and it
 *   is deliberately distinct from `colIndex`: `ppp` is a whole-economy price
 *   level, `colIndex` is a city-specific basket. Every city in the same country
 *   shares one `ppp` value, because the underlying ICP estimate is national.
 *
 * `inflation` — COUNTRY-LEVEL default annual headline CPI assumption, percent.
 *   Also shared by every city in a country. Some entries are structurally
 *   volatile (Argentina, Turkey, Egypt, Lebanon, Nigeria) and are rounded to
 *   recent headline prints; these in particular are the ones a user should
 *   replace with their own view rather than trust.
 *
 * So: `colIndex` varies city by city, while `ppp` and `inflation` are national
 * constants applied to each city in that country. `currency` and `countryCode`
 * likewise follow the country, with USD used for the dollarised economies
 * (Ecuador, Panama) and for Puerto Rico.
 *
 * ---------------------------------------------------------------------------
 * CONVENTIONS
 * ---------------------------------------------------------------------------
 * `id` is a stable ASCII kebab slug, `{countryCode}-{city}`, with the state
 * code appended for US entries so "us-portland-or" and "us-portland-me" stay
 * distinct. Slugs never carry diacritics even when the display name does.
 * `region` is the two-letter state code for the US, the province code for
 * Canada, the state code for Australia, the state for India, and the
 * province/region name elsewhere — empty for city-states.
 */

export const CITIES: CityRecord[] = [
  // ---- United States — Northeast & Mid-Atlantic ----
  { id: "us-new-york-ny", city: "New York", region: "NY", country: "United States", countryCode: "US", currency: "USD", colIndex: 168, ppp: 1, inflation: 3, aliases: ["NYC", "Manhattan", "Brooklyn"], popular: true },
  { id: "us-boston-ma", city: "Boston", region: "MA", country: "United States", countryCode: "US", currency: "USD", colIndex: 140, ppp: 1, inflation: 3 },
  { id: "us-washington-dc", city: "Washington", region: "DC", country: "United States", countryCode: "US", currency: "USD", colIndex: 137, ppp: 1, inflation: 3, aliases: ["DC", "District of Columbia", "Washington DC"] },
  { id: "us-jersey-city-nj", city: "Jersey City", region: "NJ", country: "United States", countryCode: "US", currency: "USD", colIndex: 130, ppp: 1, inflation: 3 },
  { id: "us-bridgeport-ct", city: "Bridgeport", region: "CT", country: "United States", countryCode: "US", currency: "USD", colIndex: 122, ppp: 1, inflation: 3, aliases: ["Stamford", "Fairfield County"] },
  { id: "us-newark-nj", city: "Newark", region: "NJ", country: "United States", countryCode: "US", currency: "USD", colIndex: 118, ppp: 1, inflation: 3 },
  { id: "us-burlington-vt", city: "Burlington", region: "VT", country: "United States", countryCode: "US", currency: "USD", colIndex: 113, ppp: 1, inflation: 3 },
  { id: "us-portland-me", city: "Portland", region: "ME", country: "United States", countryCode: "US", currency: "USD", colIndex: 112, ppp: 1, inflation: 3 },
  { id: "us-manchester-nh", city: "Manchester", region: "NH", country: "United States", countryCode: "US", currency: "USD", colIndex: 110, ppp: 1, inflation: 3 },
  { id: "us-new-haven-ct", city: "New Haven", region: "CT", country: "United States", countryCode: "US", currency: "USD", colIndex: 110, ppp: 1, inflation: 3 },
  { id: "us-hartford-ct", city: "Hartford", region: "CT", country: "United States", countryCode: "US", currency: "USD", colIndex: 108, ppp: 1, inflation: 3 },
  { id: "us-providence-ri", city: "Providence", region: "RI", country: "United States", countryCode: "US", currency: "USD", colIndex: 108, ppp: 1, inflation: 3 },
  { id: "us-trenton-nj", city: "Trenton", region: "NJ", country: "United States", countryCode: "US", currency: "USD", colIndex: 108, ppp: 1, inflation: 3 },
  { id: "us-worcester-ma", city: "Worcester", region: "MA", country: "United States", countryCode: "US", currency: "USD", colIndex: 108, ppp: 1, inflation: 3 },
  { id: "us-philadelphia-pa", city: "Philadelphia", region: "PA", country: "United States", countryCode: "US", currency: "USD", colIndex: 105, ppp: 1, inflation: 3, aliases: ["Philly"] },
  { id: "us-baltimore-md", city: "Baltimore", region: "MD", country: "United States", countryCode: "US", currency: "USD", colIndex: 104, ppp: 1, inflation: 3 },
  { id: "us-wilmington-de", city: "Wilmington", region: "DE", country: "United States", countryCode: "US", currency: "USD", colIndex: 100, ppp: 1, inflation: 3 },
  { id: "us-albany-ny", city: "Albany", region: "NY", country: "United States", countryCode: "US", currency: "USD", colIndex: 98, ppp: 1, inflation: 3 },
  { id: "us-pittsburgh-pa", city: "Pittsburgh", region: "PA", country: "United States", countryCode: "US", currency: "USD", colIndex: 92, ppp: 1, inflation: 3 },
  { id: "us-buffalo-ny", city: "Buffalo", region: "NY", country: "United States", countryCode: "US", currency: "USD", colIndex: 91, ppp: 1, inflation: 3 },

  // ---- United States — South ----
  { id: "us-miami-fl", city: "Miami", region: "FL", country: "United States", countryCode: "US", currency: "USD", colIndex: 122, ppp: 1, inflation: 3, popular: true },
  { id: "us-naples-fl", city: "Naples", region: "FL", country: "United States", countryCode: "US", currency: "USD", colIndex: 118, ppp: 1, inflation: 3 },
  { id: "us-west-palm-beach-fl", city: "West Palm Beach", region: "FL", country: "United States", countryCode: "US", currency: "USD", colIndex: 118, ppp: 1, inflation: 3 },
  { id: "us-charleston-sc", city: "Charleston", region: "SC", country: "United States", countryCode: "US", currency: "USD", colIndex: 105, ppp: 1, inflation: 3 },
  { id: "us-austin-tx", city: "Austin", region: "TX", country: "United States", countryCode: "US", currency: "USD", colIndex: 103, ppp: 1, inflation: 3, aliases: ["ATX"], popular: true },
  { id: "us-tampa-fl", city: "Tampa", region: "FL", country: "United States", countryCode: "US", currency: "USD", colIndex: 102, ppp: 1, inflation: 3, aliases: ["St. Petersburg"] },
  { id: "us-orlando-fl", city: "Orlando", region: "FL", country: "United States", countryCode: "US", currency: "USD", colIndex: 101, ppp: 1, inflation: 3 },
  { id: "us-nashville-tn", city: "Nashville", region: "TN", country: "United States", countryCode: "US", currency: "USD", colIndex: 101, ppp: 1, inflation: 3 },
  { id: "us-atlanta-ga", city: "Atlanta", region: "GA", country: "United States", countryCode: "US", currency: "USD", colIndex: 100, ppp: 1, inflation: 3, aliases: ["ATL"] },
  { id: "us-virginia-beach-va", city: "Virginia Beach", region: "VA", country: "United States", countryCode: "US", currency: "USD", colIndex: 100, ppp: 1, inflation: 3, aliases: ["Norfolk", "Hampton Roads"] },
  { id: "us-dallas-tx", city: "Dallas", region: "TX", country: "United States", countryCode: "US", currency: "USD", colIndex: 99, ppp: 1, inflation: 3, aliases: ["DFW"] },
  { id: "us-charlotte-nc", city: "Charlotte", region: "NC", country: "United States", countryCode: "US", currency: "USD", colIndex: 97, ppp: 1, inflation: 3 },
  { id: "us-raleigh-nc", city: "Raleigh", region: "NC", country: "United States", countryCode: "US", currency: "USD", colIndex: 97, ppp: 1, inflation: 3, aliases: ["Research Triangle"] },
  { id: "us-richmond-va", city: "Richmond", region: "VA", country: "United States", countryCode: "US", currency: "USD", colIndex: 97, ppp: 1, inflation: 3 },
  { id: "us-durham-nc", city: "Durham", region: "NC", country: "United States", countryCode: "US", currency: "USD", colIndex: 97, ppp: 1, inflation: 3 },
  { id: "us-new-orleans-la", city: "New Orleans", region: "LA", country: "United States", countryCode: "US", currency: "USD", colIndex: 96, ppp: 1, inflation: 3, aliases: ["NOLA"] },
  { id: "us-savannah-ga", city: "Savannah", region: "GA", country: "United States", countryCode: "US", currency: "USD", colIndex: 96, ppp: 1, inflation: 3 },
  { id: "us-fort-worth-tx", city: "Fort Worth", region: "TX", country: "United States", countryCode: "US", currency: "USD", colIndex: 96, ppp: 1, inflation: 3 },
  { id: "us-jacksonville-fl", city: "Jacksonville", region: "FL", country: "United States", countryCode: "US", currency: "USD", colIndex: 95, ppp: 1, inflation: 3 },
  { id: "us-houston-tx", city: "Houston", region: "TX", country: "United States", countryCode: "US", currency: "USD", colIndex: 94, ppp: 1, inflation: 3 },
  { id: "us-san-antonio-tx", city: "San Antonio", region: "TX", country: "United States", countryCode: "US", currency: "USD", colIndex: 93, ppp: 1, inflation: 3 },
  { id: "us-baton-rouge-la", city: "Baton Rouge", region: "LA", country: "United States", countryCode: "US", currency: "USD", colIndex: 92, ppp: 1, inflation: 3 },
  { id: "us-greenville-sc", city: "Greenville", region: "SC", country: "United States", countryCode: "US", currency: "USD", colIndex: 92, ppp: 1, inflation: 3 },
  { id: "us-huntsville-al", city: "Huntsville", region: "AL", country: "United States", countryCode: "US", currency: "USD", colIndex: 92, ppp: 1, inflation: 3 },
  { id: "us-knoxville-tn", city: "Knoxville", region: "TN", country: "United States", countryCode: "US", currency: "USD", colIndex: 91, ppp: 1, inflation: 3 },
  { id: "us-lexington-ky", city: "Lexington", region: "KY", country: "United States", countryCode: "US", currency: "USD", colIndex: 91, ppp: 1, inflation: 3 },
  { id: "us-louisville-ky", city: "Louisville", region: "KY", country: "United States", countryCode: "US", currency: "USD", colIndex: 89, ppp: 1, inflation: 3 },
  { id: "us-birmingham-al", city: "Birmingham", region: "AL", country: "United States", countryCode: "US", currency: "USD", colIndex: 87, ppp: 1, inflation: 3 },
  { id: "us-el-paso-tx", city: "El Paso", region: "TX", country: "United States", countryCode: "US", currency: "USD", colIndex: 87, ppp: 1, inflation: 3 },
  { id: "us-memphis-tn", city: "Memphis", region: "TN", country: "United States", countryCode: "US", currency: "USD", colIndex: 85, ppp: 1, inflation: 3 },
  { id: "us-oklahoma-city-ok", city: "Oklahoma City", region: "OK", country: "United States", countryCode: "US", currency: "USD", colIndex: 85, ppp: 1, inflation: 3, aliases: ["OKC"] },
  { id: "us-tulsa-ok", city: "Tulsa", region: "OK", country: "United States", countryCode: "US", currency: "USD", colIndex: 84, ppp: 1, inflation: 3 },

  // ---- United States — Midwest ----
  { id: "us-chicago-il", city: "Chicago", region: "IL", country: "United States", countryCode: "US", currency: "USD", colIndex: 108, ppp: 1, inflation: 3, popular: true },
  { id: "us-ann-arbor-mi", city: "Ann Arbor", region: "MI", country: "United States", countryCode: "US", currency: "USD", colIndex: 104, ppp: 1, inflation: 3 },
  { id: "us-madison-wi", city: "Madison", region: "WI", country: "United States", countryCode: "US", currency: "USD", colIndex: 100, ppp: 1, inflation: 3 },
  { id: "us-minneapolis-mn", city: "Minneapolis", region: "MN", country: "United States", countryCode: "US", currency: "USD", colIndex: 100, ppp: 1, inflation: 3, aliases: ["Twin Cities", "Saint Paul"] },
  { id: "us-milwaukee-wi", city: "Milwaukee", region: "WI", country: "United States", countryCode: "US", currency: "USD", colIndex: 94, ppp: 1, inflation: 3 },
  { id: "us-detroit-mi", city: "Detroit", region: "MI", country: "United States", countryCode: "US", currency: "USD", colIndex: 91, ppp: 1, inflation: 3 },
  { id: "us-columbus-oh", city: "Columbus", region: "OH", country: "United States", countryCode: "US", currency: "USD", colIndex: 91, ppp: 1, inflation: 3 },
  { id: "us-indianapolis-in", city: "Indianapolis", region: "IN", country: "United States", countryCode: "US", currency: "USD", colIndex: 90, ppp: 1, inflation: 3, aliases: ["Indy"] },
  { id: "us-kansas-city-mo", city: "Kansas City", region: "MO", country: "United States", countryCode: "US", currency: "USD", colIndex: 89, ppp: 1, inflation: 3 },
  { id: "us-des-moines-ia", city: "Des Moines", region: "IA", country: "United States", countryCode: "US", currency: "USD", colIndex: 89, ppp: 1, inflation: 3 },
  { id: "us-omaha-ne", city: "Omaha", region: "NE", country: "United States", countryCode: "US", currency: "USD", colIndex: 89, ppp: 1, inflation: 3 },
  { id: "us-cleveland-oh", city: "Cleveland", region: "OH", country: "United States", countryCode: "US", currency: "USD", colIndex: 88, ppp: 1, inflation: 3 },
  { id: "us-st-louis-mo", city: "St. Louis", region: "MO", country: "United States", countryCode: "US", currency: "USD", colIndex: 88, ppp: 1, inflation: 3, aliases: ["Saint Louis", "STL"] },
  { id: "us-wichita-ks", city: "Wichita", region: "KS", country: "United States", countryCode: "US", currency: "USD", colIndex: 82, ppp: 1, inflation: 3 },

  // ---- United States — Mountain West & Southwest ----
  { id: "us-boulder-co", city: "Boulder", region: "CO", country: "United States", countryCode: "US", currency: "USD", colIndex: 124, ppp: 1, inflation: 3 },
  { id: "us-denver-co", city: "Denver", region: "CO", country: "United States", countryCode: "US", currency: "USD", colIndex: 112, ppp: 1, inflation: 3 },
  { id: "us-santa-fe-nm", city: "Santa Fe", region: "NM", country: "United States", countryCode: "US", currency: "USD", colIndex: 108, ppp: 1, inflation: 3 },
  { id: "us-reno-nv", city: "Reno", region: "NV", country: "United States", countryCode: "US", currency: "USD", colIndex: 108, ppp: 1, inflation: 3 },
  { id: "us-fort-collins-co", city: "Fort Collins", region: "CO", country: "United States", countryCode: "US", currency: "USD", colIndex: 105, ppp: 1, inflation: 3 },
  { id: "us-salt-lake-city-ut", city: "Salt Lake City", region: "UT", country: "United States", countryCode: "US", currency: "USD", colIndex: 104, ppp: 1, inflation: 3, aliases: ["SLC"] },
  { id: "us-phoenix-az", city: "Phoenix", region: "AZ", country: "United States", countryCode: "US", currency: "USD", colIndex: 103, ppp: 1, inflation: 3, aliases: ["Scottsdale", "Tempe"] },
  { id: "us-las-vegas-nv", city: "Las Vegas", region: "NV", country: "United States", countryCode: "US", currency: "USD", colIndex: 102, ppp: 1, inflation: 3 },
  { id: "us-colorado-springs-co", city: "Colorado Springs", region: "CO", country: "United States", countryCode: "US", currency: "USD", colIndex: 101, ppp: 1, inflation: 3 },
  { id: "us-boise-id", city: "Boise", region: "ID", country: "United States", countryCode: "US", currency: "USD", colIndex: 100, ppp: 1, inflation: 3 },
  { id: "us-tucson-az", city: "Tucson", region: "AZ", country: "United States", countryCode: "US", currency: "USD", colIndex: 93, ppp: 1, inflation: 3 },
  { id: "us-albuquerque-nm", city: "Albuquerque", region: "NM", country: "United States", countryCode: "US", currency: "USD", colIndex: 92, ppp: 1, inflation: 3, aliases: ["ABQ"] },

  // ---- United States — West Coast & Pacific ----
  { id: "us-san-francisco-ca", city: "San Francisco", region: "CA", country: "United States", countryCode: "US", currency: "USD", colIndex: 165, ppp: 1, inflation: 3, aliases: ["SF", "Bay Area"], popular: true },
  { id: "us-san-jose-ca", city: "San Jose", region: "CA", country: "United States", countryCode: "US", currency: "USD", colIndex: 158, ppp: 1, inflation: 3, aliases: ["Silicon Valley", "South Bay"] },
  { id: "us-honolulu-hi", city: "Honolulu", region: "HI", country: "United States", countryCode: "US", currency: "USD", colIndex: 152, ppp: 1, inflation: 3, aliases: ["Oahu"] },
  { id: "us-oakland-ca", city: "Oakland", region: "CA", country: "United States", countryCode: "US", currency: "USD", colIndex: 145, ppp: 1, inflation: 3, aliases: ["East Bay", "Berkeley"] },
  { id: "us-seattle-wa", city: "Seattle", region: "WA", country: "United States", countryCode: "US", currency: "USD", colIndex: 138, ppp: 1, inflation: 3, popular: true },
  { id: "us-los-angeles-ca", city: "Los Angeles", region: "CA", country: "United States", countryCode: "US", currency: "USD", colIndex: 136, ppp: 1, inflation: 3, aliases: ["LA", "Santa Monica"] },
  { id: "us-san-diego-ca", city: "San Diego", region: "CA", country: "United States", countryCode: "US", currency: "USD", colIndex: 133, ppp: 1, inflation: 3 },
  { id: "us-anchorage-ak", city: "Anchorage", region: "AK", country: "United States", countryCode: "US", currency: "USD", colIndex: 116, ppp: 1, inflation: 3 },
  { id: "us-bend-or", city: "Bend", region: "OR", country: "United States", countryCode: "US", currency: "USD", colIndex: 116, ppp: 1, inflation: 3 },
  { id: "us-portland-or", city: "Portland", region: "OR", country: "United States", countryCode: "US", currency: "USD", colIndex: 115, ppp: 1, inflation: 3, aliases: ["PDX"] },
  { id: "us-sacramento-ca", city: "Sacramento", region: "CA", country: "United States", countryCode: "US", currency: "USD", colIndex: 114, ppp: 1, inflation: 3 },
  { id: "us-tacoma-wa", city: "Tacoma", region: "WA", country: "United States", countryCode: "US", currency: "USD", colIndex: 112, ppp: 1, inflation: 3 },
  { id: "us-spokane-wa", city: "Spokane", region: "WA", country: "United States", countryCode: "US", currency: "USD", colIndex: 98, ppp: 1, inflation: 3 },

  // ---- Canada ----
  { id: "ca-vancouver-bc", city: "Vancouver", region: "BC", country: "Canada", countryCode: "CA", currency: "CAD", colIndex: 110, ppp: 0.86, inflation: 2.6 },
  { id: "ca-toronto-on", city: "Toronto", region: "ON", country: "Canada", countryCode: "CA", currency: "CAD", colIndex: 105, ppp: 0.86, inflation: 2.6, aliases: ["GTA"], popular: true },
  { id: "ca-victoria-bc", city: "Victoria", region: "BC", country: "Canada", countryCode: "CA", currency: "CAD", colIndex: 102, ppp: 0.86, inflation: 2.6 },
  { id: "ca-ottawa-on", city: "Ottawa", region: "ON", country: "Canada", countryCode: "CA", currency: "CAD", colIndex: 98, ppp: 0.86, inflation: 2.6 },
  { id: "ca-calgary-ab", city: "Calgary", region: "AB", country: "Canada", countryCode: "CA", currency: "CAD", colIndex: 95, ppp: 0.86, inflation: 2.6 },
  { id: "ca-kitchener-waterloo-on", city: "Kitchener-Waterloo", region: "ON", country: "Canada", countryCode: "CA", currency: "CAD", colIndex: 94, ppp: 0.86, inflation: 2.6, aliases: ["Waterloo", "Kitchener"] },
  { id: "ca-montreal-qc", city: "Montreal", region: "QC", country: "Canada", countryCode: "CA", currency: "CAD", colIndex: 92, ppp: 0.86, inflation: 2.6 },
  { id: "ca-halifax-ns", city: "Halifax", region: "NS", country: "Canada", countryCode: "CA", currency: "CAD", colIndex: 92, ppp: 0.86, inflation: 2.6 },
  { id: "ca-edmonton-ab", city: "Edmonton", region: "AB", country: "Canada", countryCode: "CA", currency: "CAD", colIndex: 90, ppp: 0.86, inflation: 2.6 },
  { id: "ca-quebec-city-qc", city: "Quebec City", region: "QC", country: "Canada", countryCode: "CA", currency: "CAD", colIndex: 88, ppp: 0.86, inflation: 2.6, aliases: ["Ville de Quebec", "Québec"] },
  { id: "ca-winnipeg-mb", city: "Winnipeg", region: "MB", country: "Canada", countryCode: "CA", currency: "CAD", colIndex: 86, ppp: 0.86, inflation: 2.6 },

  // ---- United Kingdom & Ireland ----
  { id: "gb-london", city: "London", region: "England", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 128, ppp: 0.75, inflation: 3.4, popular: true },
  { id: "ie-dublin", city: "Dublin", region: "Leinster", country: "Ireland", countryCode: "IE", currency: "EUR", colIndex: 115, ppp: 0.94, inflation: 2.6 },
  { id: "gb-oxford", city: "Oxford", region: "England", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 100, ppp: 0.75, inflation: 3.4 },
  { id: "gb-cambridge", city: "Cambridge", region: "England", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 98, ppp: 0.75, inflation: 3.4 },
  { id: "gb-brighton", city: "Brighton", region: "England", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 95, ppp: 0.75, inflation: 3.4 },
  { id: "gb-edinburgh", city: "Edinburgh", region: "Scotland", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 92, ppp: 0.75, inflation: 3.4 },
  { id: "ie-cork", city: "Cork", region: "Munster", country: "Ireland", countryCode: "IE", currency: "EUR", colIndex: 92, ppp: 0.94, inflation: 2.6 },
  { id: "gb-bristol", city: "Bristol", region: "England", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 90, ppp: 0.75, inflation: 3.4 },
  { id: "ie-galway", city: "Galway", region: "Connacht", country: "Ireland", countryCode: "IE", currency: "EUR", colIndex: 90, ppp: 0.94, inflation: 2.6 },
  { id: "gb-manchester", city: "Manchester", region: "England", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 82, ppp: 0.75, inflation: 3.4 },
  { id: "gb-birmingham", city: "Birmingham", region: "England", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 78, ppp: 0.75, inflation: 3.4 },
  { id: "gb-glasgow", city: "Glasgow", region: "Scotland", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 78, ppp: 0.75, inflation: 3.4 },
  { id: "gb-leeds", city: "Leeds", region: "England", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 78, ppp: 0.75, inflation: 3.4 },
  { id: "gb-cardiff", city: "Cardiff", region: "Wales", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 78, ppp: 0.75, inflation: 3.4 },
  { id: "gb-belfast", city: "Belfast", region: "Northern Ireland", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 76, ppp: 0.75, inflation: 3.4 },
  { id: "gb-liverpool", city: "Liverpool", region: "England", country: "United Kingdom", countryCode: "GB", currency: "GBP", colIndex: 74, ppp: 0.75, inflation: 3.4 },

  // ---- Western Europe ----
  { id: "ch-zurich", city: "Zürich", region: "Zürich", country: "Switzerland", countryCode: "CH", currency: "CHF", colIndex: 165, ppp: 1.35, inflation: 1.4 },
  { id: "ch-geneva", city: "Geneva", region: "Geneva", country: "Switzerland", countryCode: "CH", currency: "CHF", colIndex: 160, ppp: 1.35, inflation: 1.4, aliases: ["Genève"] },
  { id: "ch-basel", city: "Basel", region: "Basel-Stadt", country: "Switzerland", countryCode: "CH", currency: "CHF", colIndex: 145, ppp: 1.35, inflation: 1.4 },
  { id: "lu-luxembourg-city", city: "Luxembourg City", region: "", country: "Luxembourg", countryCode: "LU", currency: "EUR", colIndex: 120, ppp: 0.95, inflation: 2.4 },
  { id: "nl-amsterdam", city: "Amsterdam", region: "North Holland", country: "Netherlands", countryCode: "NL", currency: "EUR", colIndex: 112, ppp: 0.86, inflation: 2.8 },
  { id: "fr-paris", city: "Paris", region: "Île-de-France", country: "France", countryCode: "FR", currency: "EUR", colIndex: 110, ppp: 0.78, inflation: 2.3 },
  { id: "de-munich", city: "Munich", region: "Bavaria", country: "Germany", countryCode: "DE", currency: "EUR", colIndex: 105, ppp: 0.8, inflation: 2.4, aliases: ["München"] },
  { id: "de-frankfurt", city: "Frankfurt", region: "Hesse", country: "Germany", countryCode: "DE", currency: "EUR", colIndex: 98, ppp: 0.8, inflation: 2.4 },
  { id: "de-berlin", city: "Berlin", region: "Berlin", country: "Germany", countryCode: "DE", currency: "EUR", colIndex: 95, ppp: 0.8, inflation: 2.4, popular: true },
  { id: "de-hamburg", city: "Hamburg", region: "Hamburg", country: "Germany", countryCode: "DE", currency: "EUR", colIndex: 93, ppp: 0.8, inflation: 2.4 },
  { id: "nl-rotterdam", city: "Rotterdam", region: "South Holland", country: "Netherlands", countryCode: "NL", currency: "EUR", colIndex: 92, ppp: 0.86, inflation: 2.8 },
  { id: "be-brussels", city: "Brussels", region: "Brussels-Capital", country: "Belgium", countryCode: "BE", currency: "EUR", colIndex: 92, ppp: 0.85, inflation: 2.4, aliases: ["Bruxelles", "Brussel"] },
  { id: "at-vienna", city: "Vienna", region: "Vienna", country: "Austria", countryCode: "AT", currency: "EUR", colIndex: 90, ppp: 0.84, inflation: 2.4, aliases: ["Wien"] },
  { id: "fr-nice", city: "Nice", region: "Provence-Alpes-Côte d'Azur", country: "France", countryCode: "FR", currency: "EUR", colIndex: 88, ppp: 0.78, inflation: 2.3 },
  { id: "be-antwerp", city: "Antwerp", region: "Flanders", country: "Belgium", countryCode: "BE", currency: "EUR", colIndex: 86, ppp: 0.85, inflation: 2.4, aliases: ["Antwerpen"] },
  { id: "fr-lyon", city: "Lyon", region: "Auvergne-Rhône-Alpes", country: "France", countryCode: "FR", currency: "EUR", colIndex: 85, ppp: 0.78, inflation: 2.3 },

  // ---- Nordics ----
  { id: "is-reykjavik", city: "Reykjavík", region: "Capital Region", country: "Iceland", countryCode: "IS", currency: "ISK", colIndex: 125, ppp: 1.18, inflation: 5 },
  { id: "no-oslo", city: "Oslo", region: "Oslo", country: "Norway", countryCode: "NO", currency: "NOK", colIndex: 122, ppp: 1.2, inflation: 3 },
  { id: "dk-copenhagen", city: "Copenhagen", region: "Capital Region", country: "Denmark", countryCode: "DK", currency: "DKK", colIndex: 118, ppp: 1.12, inflation: 2, aliases: ["København"] },
  { id: "fi-helsinki", city: "Helsinki", region: "Uusimaa", country: "Finland", countryCode: "FI", currency: "EUR", colIndex: 105, ppp: 0.9, inflation: 2.4 },
  { id: "se-stockholm", city: "Stockholm", region: "Stockholm", country: "Sweden", countryCode: "SE", currency: "SEK", colIndex: 100, ppp: 0.85, inflation: 2.2 },

  // ---- Southern Europe & Mediterranean ----
  { id: "it-milan", city: "Milan", region: "Lombardy", country: "Italy", countryCode: "IT", currency: "EUR", colIndex: 92, ppp: 0.72, inflation: 2.2, aliases: ["Milano"] },
  { id: "es-barcelona", city: "Barcelona", region: "Catalonia", country: "Spain", countryCode: "ES", currency: "EUR", colIndex: 82, ppp: 0.68, inflation: 2.8 },
  { id: "it-rome", city: "Rome", region: "Lazio", country: "Italy", countryCode: "IT", currency: "EUR", colIndex: 82, ppp: 0.72, inflation: 2.2, aliases: ["Roma"] },
  { id: "es-madrid", city: "Madrid", region: "Madrid", country: "Spain", countryCode: "ES", currency: "EUR", colIndex: 80, ppp: 0.68, inflation: 2.8 },
  { id: "it-florence", city: "Florence", region: "Tuscany", country: "Italy", countryCode: "IT", currency: "EUR", colIndex: 80, ppp: 0.72, inflation: 2.2, aliases: ["Firenze"] },
  { id: "mt-valletta", city: "Valletta", region: "", country: "Malta", countryCode: "MT", currency: "EUR", colIndex: 74, ppp: 0.72, inflation: 2.6 },
  { id: "pt-lisbon", city: "Lisbon", region: "Lisbon", country: "Portugal", countryCode: "PT", currency: "EUR", colIndex: 72, ppp: 0.62, inflation: 2.5, aliases: ["Lisboa"], popular: true },
  { id: "es-valencia", city: "Valencia", region: "Valencia", country: "Spain", countryCode: "ES", currency: "EUR", colIndex: 68, ppp: 0.68, inflation: 2.8 },
  { id: "cy-nicosia", city: "Nicosia", region: "Nicosia", country: "Cyprus", countryCode: "CY", currency: "EUR", colIndex: 68, ppp: 0.7, inflation: 2.2, aliases: ["Lefkosia"] },
  { id: "si-ljubljana", city: "Ljubljana", region: "Central Slovenia", country: "Slovenia", countryCode: "SI", currency: "EUR", colIndex: 66, ppp: 0.62, inflation: 2.4 },
  { id: "pt-porto", city: "Porto", region: "Porto", country: "Portugal", countryCode: "PT", currency: "EUR", colIndex: 63, ppp: 0.62, inflation: 2.5, aliases: ["Oporto"] },
  { id: "gr-athens", city: "Athens", region: "Attica", country: "Greece", countryCode: "GR", currency: "EUR", colIndex: 62, ppp: 0.6, inflation: 2.9, aliases: ["Athina"] },
  { id: "hr-zagreb", city: "Zagreb", region: "Zagreb", country: "Croatia", countryCode: "HR", currency: "EUR", colIndex: 58, ppp: 0.58, inflation: 3 },

  // ---- Central & Eastern Europe, Türkiye ----
  { id: "cz-prague", city: "Prague", region: "Prague", country: "Czechia", countryCode: "CZ", currency: "CZK", colIndex: 68, ppp: 0.58, inflation: 2.6, aliases: ["Praha", "Czech Republic"] },
  { id: "ee-tallinn", city: "Tallinn", region: "Harju", country: "Estonia", countryCode: "EE", currency: "EUR", colIndex: 66, ppp: 0.66, inflation: 3.2 },
  { id: "pl-warsaw", city: "Warsaw", region: "Masovia", country: "Poland", countryCode: "PL", currency: "PLN", colIndex: 60, ppp: 0.5, inflation: 4.2, aliases: ["Warszawa"] },
  { id: "lv-riga", city: "Riga", region: "Riga", country: "Latvia", countryCode: "LV", currency: "EUR", colIndex: 60, ppp: 0.62, inflation: 2.6 },
  { id: "lt-vilnius", city: "Vilnius", region: "Vilnius", country: "Lithuania", countryCode: "LT", currency: "EUR", colIndex: 58, ppp: 0.6, inflation: 2.4 },
  { id: "hu-budapest", city: "Budapest", region: "Budapest", country: "Hungary", countryCode: "HU", currency: "HUF", colIndex: 55, ppp: 0.5, inflation: 4.5 },
  { id: "pl-krakow", city: "Kraków", region: "Lesser Poland", country: "Poland", countryCode: "PL", currency: "PLN", colIndex: 54, ppp: 0.5, inflation: 4.2, aliases: ["Cracow"] },
  { id: "ro-bucharest", city: "Bucharest", region: "Bucharest", country: "Romania", countryCode: "RO", currency: "RON", colIndex: 52, ppp: 0.45, inflation: 5.2, aliases: ["Bucuresti"] },
  { id: "bg-sofia", city: "Sofia", region: "Sofia City", country: "Bulgaria", countryCode: "BG", currency: "BGN", colIndex: 48, ppp: 0.44, inflation: 3 },
  { id: "rs-belgrade", city: "Belgrade", region: "Belgrade", country: "Serbia", countryCode: "RS", currency: "RSD", colIndex: 46, ppp: 0.44, inflation: 4.5, aliases: ["Beograd"] },
  { id: "tr-istanbul", city: "Istanbul", region: "Istanbul", country: "Türkiye", countryCode: "TR", currency: "TRY", colIndex: 42, ppp: 0.35, inflation: 32, aliases: ["Constantinople", "Turkey"] },
  { id: "tr-izmir", city: "İzmir", region: "İzmir", country: "Türkiye", countryCode: "TR", currency: "TRY", colIndex: 34, ppp: 0.35, inflation: 32, aliases: ["Smyrna", "Turkey"] },

  // ---- Middle East ----
  { id: "il-tel-aviv", city: "Tel Aviv", region: "Tel Aviv", country: "Israel", countryCode: "IL", currency: "ILS", colIndex: 128, ppp: 1.05, inflation: 3.2 },
  { id: "il-jerusalem", city: "Jerusalem", region: "Jerusalem", country: "Israel", countryCode: "IL", currency: "ILS", colIndex: 105, ppp: 1.05, inflation: 3.2 },
  { id: "ae-dubai", city: "Dubai", region: "Dubai", country: "United Arab Emirates", countryCode: "AE", currency: "AED", colIndex: 92, ppp: 0.68, inflation: 2.2, aliases: ["DXB"], popular: true },
  { id: "ae-abu-dhabi", city: "Abu Dhabi", region: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE", currency: "AED", colIndex: 85, ppp: 0.68, inflation: 2.2 },
  { id: "qa-doha", city: "Doha", region: "Doha", country: "Qatar", countryCode: "QA", currency: "QAR", colIndex: 78, ppp: 0.65, inflation: 2 },
  { id: "ae-sharjah", city: "Sharjah", region: "Sharjah", country: "United Arab Emirates", countryCode: "AE", currency: "AED", colIndex: 68, ppp: 0.68, inflation: 2.2 },
  { id: "bh-manama", city: "Manama", region: "Capital", country: "Bahrain", countryCode: "BH", currency: "BHD", colIndex: 68, ppp: 0.6, inflation: 1.5 },
  { id: "kw-kuwait-city", city: "Kuwait City", region: "", country: "Kuwait", countryCode: "KW", currency: "KWD", colIndex: 66, ppp: 0.6, inflation: 2.5 },
  { id: "sa-riyadh", city: "Riyadh", region: "Riyadh", country: "Saudi Arabia", countryCode: "SA", currency: "SAR", colIndex: 62, ppp: 0.52, inflation: 2 },
  { id: "om-muscat", city: "Muscat", region: "Muscat", country: "Oman", countryCode: "OM", currency: "OMR", colIndex: 60, ppp: 0.55, inflation: 1.5 },
  { id: "sa-jeddah", city: "Jeddah", region: "Makkah", country: "Saudi Arabia", countryCode: "SA", currency: "SAR", colIndex: 58, ppp: 0.52, inflation: 2 },
  { id: "jo-amman", city: "Amman", region: "Amman", country: "Jordan", countryCode: "JO", currency: "JOD", colIndex: 58, ppp: 0.45, inflation: 2.5 },
  { id: "lb-beirut", city: "Beirut", region: "Beirut", country: "Lebanon", countryCode: "LB", currency: "LBP", colIndex: 55, ppp: 0.4, inflation: 20 },

  // ---- Africa & North Africa ----
  { id: "za-cape-town", city: "Cape Town", region: "Western Cape", country: "South Africa", countryCode: "ZA", currency: "ZAR", colIndex: 46, ppp: 0.38, inflation: 5 },
  { id: "za-johannesburg", city: "Johannesburg", region: "Gauteng", country: "South Africa", countryCode: "ZA", currency: "ZAR", colIndex: 42, ppp: 0.38, inflation: 5, aliases: ["Joburg", "Jozi"] },
  { id: "za-durban", city: "Durban", region: "KwaZulu-Natal", country: "South Africa", countryCode: "ZA", currency: "ZAR", colIndex: 38, ppp: 0.38, inflation: 5 },
  { id: "ke-nairobi", city: "Nairobi", region: "Nairobi", country: "Kenya", countryCode: "KE", currency: "KES", colIndex: 38, ppp: 0.35, inflation: 6 },
  { id: "gh-accra", city: "Accra", region: "Greater Accra", country: "Ghana", countryCode: "GH", currency: "GHS", colIndex: 38, ppp: 0.32, inflation: 20 },
  { id: "ma-casablanca", city: "Casablanca", region: "Casablanca-Settat", country: "Morocco", countryCode: "MA", currency: "MAD", colIndex: 38, ppp: 0.38, inflation: 2 },
  { id: "ng-lagos", city: "Lagos", region: "Lagos", country: "Nigeria", countryCode: "NG", currency: "NGN", colIndex: 36, ppp: 0.3, inflation: 24 },
  { id: "sn-dakar", city: "Dakar", region: "Dakar", country: "Senegal", countryCode: "SN", currency: "XOF", colIndex: 36, ppp: 0.4, inflation: 3 },
  { id: "ma-marrakesh", city: "Marrakesh", region: "Marrakesh-Safi", country: "Morocco", countryCode: "MA", currency: "MAD", colIndex: 34, ppp: 0.38, inflation: 2, aliases: ["Marrakech"] },
  { id: "rw-kigali", city: "Kigali", region: "Kigali", country: "Rwanda", countryCode: "RW", currency: "RWF", colIndex: 32, ppp: 0.3, inflation: 6 },
  { id: "tn-tunis", city: "Tunis", region: "Tunis", country: "Tunisia", countryCode: "TN", currency: "TND", colIndex: 30, ppp: 0.33, inflation: 7 },
  { id: "et-addis-ababa", city: "Addis Ababa", region: "Addis Ababa", country: "Ethiopia", countryCode: "ET", currency: "ETB", colIndex: 30, ppp: 0.3, inflation: 20 },
  { id: "eg-cairo", city: "Cairo", region: "Cairo", country: "Egypt", countryCode: "EG", currency: "EGP", colIndex: 27, ppp: 0.22, inflation: 18 },
  { id: "eg-alexandria", city: "Alexandria", region: "Alexandria", country: "Egypt", countryCode: "EG", currency: "EGP", colIndex: 24, ppp: 0.22, inflation: 18 },

  // ---- South Asia ----
  { id: "in-mumbai", city: "Mumbai", region: "Maharashtra", country: "India", countryCode: "IN", currency: "INR", colIndex: 34, ppp: 0.28, inflation: 5.2, aliases: ["Bombay", "BOM"], popular: true },
  { id: "in-bangalore", city: "Bangalore", region: "Karnataka", country: "India", countryCode: "IN", currency: "INR", colIndex: 30, ppp: 0.28, inflation: 5.2, aliases: ["Bengaluru", "BLR"], popular: true },
  { id: "in-gurgaon", city: "Gurgaon", region: "Haryana", country: "India", countryCode: "IN", currency: "INR", colIndex: 30, ppp: 0.28, inflation: 5.2, aliases: ["Gurugram", "NCR"] },
  { id: "in-delhi", city: "Delhi", region: "Delhi", country: "India", countryCode: "IN", currency: "INR", colIndex: 29, ppp: 0.28, inflation: 5.2, aliases: ["New Delhi", "NCR", "DEL"] },
  { id: "in-noida", city: "Noida", region: "Uttar Pradesh", country: "India", countryCode: "IN", currency: "INR", colIndex: 27, ppp: 0.28, inflation: 5.2, aliases: ["NCR", "Greater Noida"] },
  { id: "in-pune", city: "Pune", region: "Maharashtra", country: "India", countryCode: "IN", currency: "INR", colIndex: 27, ppp: 0.28, inflation: 5.2, aliases: ["Poona"] },
  { id: "in-hyderabad", city: "Hyderabad", region: "Telangana", country: "India", countryCode: "IN", currency: "INR", colIndex: 26, ppp: 0.28, inflation: 5.2, aliases: ["Cyberabad", "HYD"] },
  { id: "in-chennai", city: "Chennai", region: "Tamil Nadu", country: "India", countryCode: "IN", currency: "INR", colIndex: 26, ppp: 0.28, inflation: 5.2, aliases: ["Madras", "MAA"] },
  { id: "in-panaji", city: "Panaji", region: "Goa", country: "India", countryCode: "IN", currency: "INR", colIndex: 25, ppp: 0.28, inflation: 5.2, aliases: ["Goa", "Panjim"] },
  { id: "in-chandigarh", city: "Chandigarh", region: "Chandigarh", country: "India", countryCode: "IN", currency: "INR", colIndex: 24, ppp: 0.28, inflation: 5.2 },
  { id: "in-kolkata", city: "Kolkata", region: "West Bengal", country: "India", countryCode: "IN", currency: "INR", colIndex: 23, ppp: 0.28, inflation: 5.2, aliases: ["Calcutta", "CCU"] },
  { id: "in-kochi", city: "Kochi", region: "Kerala", country: "India", countryCode: "IN", currency: "INR", colIndex: 23, ppp: 0.28, inflation: 5.2, aliases: ["Cochin", "Ernakulam"] },
  { id: "in-ahmedabad", city: "Ahmedabad", region: "Gujarat", country: "India", countryCode: "IN", currency: "INR", colIndex: 22, ppp: 0.28, inflation: 5.2 },
  { id: "in-jaipur", city: "Jaipur", region: "Rajasthan", country: "India", countryCode: "IN", currency: "INR", colIndex: 21, ppp: 0.28, inflation: 5.2 },
  { id: "in-indore", city: "Indore", region: "Madhya Pradesh", country: "India", countryCode: "IN", currency: "INR", colIndex: 21, ppp: 0.28, inflation: 5.2 },
  { id: "in-thiruvananthapuram", city: "Thiruvananthapuram", region: "Kerala", country: "India", countryCode: "IN", currency: "INR", colIndex: 21, ppp: 0.28, inflation: 5.2, aliases: ["Trivandrum"] },
  { id: "in-lucknow", city: "Lucknow", region: "Uttar Pradesh", country: "India", countryCode: "IN", currency: "INR", colIndex: 20, ppp: 0.28, inflation: 5.2 },
  { id: "lk-colombo", city: "Colombo", region: "Western", country: "Sri Lanka", countryCode: "LK", currency: "LKR", colIndex: 30, ppp: 0.3, inflation: 5 },
  { id: "bd-dhaka", city: "Dhaka", region: "Dhaka", country: "Bangladesh", countryCode: "BD", currency: "BDT", colIndex: 28, ppp: 0.3, inflation: 9 },
  { id: "np-kathmandu", city: "Kathmandu", region: "Bagmati", country: "Nepal", countryCode: "NP", currency: "NPR", colIndex: 26, ppp: 0.3, inflation: 5.5 },
  { id: "pk-islamabad", city: "Islamabad", region: "Islamabad Capital Territory", country: "Pakistan", countryCode: "PK", currency: "PKR", colIndex: 26, ppp: 0.25, inflation: 12 },
  { id: "pk-karachi", city: "Karachi", region: "Sindh", country: "Pakistan", countryCode: "PK", currency: "PKR", colIndex: 24, ppp: 0.25, inflation: 12 },
  { id: "pk-lahore", city: "Lahore", region: "Punjab", country: "Pakistan", countryCode: "PK", currency: "PKR", colIndex: 23, ppp: 0.25, inflation: 12 },

  // ---- Southeast Asia ----
  { id: "sg-singapore", city: "Singapore", region: "", country: "Singapore", countryCode: "SG", currency: "SGD", colIndex: 130, ppp: 0.9, inflation: 2.4, aliases: ["SIN"], popular: true },
  { id: "th-bangkok", city: "Bangkok", region: "Bangkok", country: "Thailand", countryCode: "TH", currency: "THB", colIndex: 48, ppp: 0.4, inflation: 1.5, aliases: ["Krung Thep", "BKK"] },
  { id: "id-jakarta", city: "Jakarta", region: "Jakarta", country: "Indonesia", countryCode: "ID", currency: "IDR", colIndex: 42, ppp: 0.32, inflation: 3 },
  { id: "my-kuala-lumpur", city: "Kuala Lumpur", region: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", currency: "MYR", colIndex: 40, ppp: 0.4, inflation: 2, aliases: ["KL"] },
  { id: "id-denpasar", city: "Denpasar", region: "Bali", country: "Indonesia", countryCode: "ID", currency: "IDR", colIndex: 40, ppp: 0.32, inflation: 3, aliases: ["Bali", "Ubud", "Canggu", "Seminyak"] },
  { id: "vn-ho-chi-minh-city", city: "Ho Chi Minh City", region: "Ho Chi Minh", country: "Vietnam", countryCode: "VN", currency: "VND", colIndex: 38, ppp: 0.32, inflation: 3.4, aliases: ["Saigon", "HCMC", "SGN"] },
  { id: "ph-manila", city: "Manila", region: "Metro Manila", country: "Philippines", countryCode: "PH", currency: "PHP", colIndex: 38, ppp: 0.35, inflation: 3.6, aliases: ["Makati", "BGC"] },
  { id: "kh-phnom-penh", city: "Phnom Penh", region: "Phnom Penh", country: "Cambodia", countryCode: "KH", currency: "KHR", colIndex: 36, ppp: 0.3, inflation: 2.5 },
  { id: "th-chiang-mai", city: "Chiang Mai", region: "Chiang Mai", country: "Thailand", countryCode: "TH", currency: "THB", colIndex: 34, ppp: 0.4, inflation: 1.5 },
  { id: "vn-hanoi", city: "Hanoi", region: "Hanoi", country: "Vietnam", countryCode: "VN", currency: "VND", colIndex: 34, ppp: 0.32, inflation: 3.4, aliases: ["Ha Noi"] },
  { id: "my-penang", city: "Penang", region: "Penang", country: "Malaysia", countryCode: "MY", currency: "MYR", colIndex: 34, ppp: 0.4, inflation: 2, aliases: ["George Town", "Pulau Pinang"] },
  { id: "vn-da-nang", city: "Da Nang", region: "Da Nang", country: "Vietnam", countryCode: "VN", currency: "VND", colIndex: 32, ppp: 0.32, inflation: 3.4, aliases: ["Danang"] },

  // ---- East Asia ----
  { id: "hk-hong-kong", city: "Hong Kong", region: "", country: "Hong Kong SAR", countryCode: "HK", currency: "HKD", colIndex: 128, ppp: 0.85, inflation: 2, aliases: ["HK", "Kowloon"] },
  { id: "kr-seoul", city: "Seoul", region: "Seoul", country: "South Korea", countryCode: "KR", currency: "KRW", colIndex: 95, ppp: 0.66, inflation: 2.3, aliases: ["Gangnam", "ICN"] },
  { id: "jp-tokyo", city: "Tokyo", region: "Tokyo", country: "Japan", countryCode: "JP", currency: "JPY", colIndex: 92, ppp: 0.62, inflation: 2.2, aliases: ["Edo", "TYO"] },
  { id: "jp-osaka", city: "Osaka", region: "Osaka", country: "Japan", countryCode: "JP", currency: "JPY", colIndex: 80, ppp: 0.62, inflation: 2.2 },
  { id: "jp-kyoto", city: "Kyoto", region: "Kyoto", country: "Japan", countryCode: "JP", currency: "JPY", colIndex: 78, ppp: 0.62, inflation: 2.2 },
  { id: "kr-busan", city: "Busan", region: "Busan", country: "South Korea", countryCode: "KR", currency: "KRW", colIndex: 76, ppp: 0.66, inflation: 2.3, aliases: ["Pusan"] },
  { id: "cn-shanghai", city: "Shanghai", region: "Shanghai", country: "China", countryCode: "CN", currency: "CNY", colIndex: 72, ppp: 0.45, inflation: 1 },
  { id: "tw-taipei", city: "Taipei", region: "Taipei", country: "Taiwan", countryCode: "TW", currency: "TWD", colIndex: 72, ppp: 0.58, inflation: 2 },
  { id: "jp-fukuoka", city: "Fukuoka", region: "Fukuoka", country: "Japan", countryCode: "JP", currency: "JPY", colIndex: 72, ppp: 0.62, inflation: 2.2 },
  { id: "cn-beijing", city: "Beijing", region: "Beijing", country: "China", countryCode: "CN", currency: "CNY", colIndex: 68, ppp: 0.45, inflation: 1, aliases: ["Peking"] },
  { id: "cn-shenzhen", city: "Shenzhen", region: "Guangdong", country: "China", countryCode: "CN", currency: "CNY", colIndex: 66, ppp: 0.45, inflation: 1 },
  { id: "cn-chengdu", city: "Chengdu", region: "Sichuan", country: "China", countryCode: "CN", currency: "CNY", colIndex: 52, ppp: 0.45, inflation: 1 },

  // ---- Australia & New Zealand ----
  { id: "au-sydney", city: "Sydney", region: "NSW", country: "Australia", countryCode: "AU", currency: "AUD", colIndex: 118, ppp: 0.9, inflation: 3.2, popular: true },
  { id: "au-melbourne", city: "Melbourne", region: "VIC", country: "Australia", countryCode: "AU", currency: "AUD", colIndex: 108, ppp: 0.9, inflation: 3.2 },
  { id: "au-canberra", city: "Canberra", region: "ACT", country: "Australia", countryCode: "AU", currency: "AUD", colIndex: 105, ppp: 0.9, inflation: 3.2 },
  { id: "nz-auckland", city: "Auckland", region: "Auckland", country: "New Zealand", countryCode: "NZ", currency: "NZD", colIndex: 105, ppp: 0.85, inflation: 2.8 },
  { id: "nz-queenstown", city: "Queenstown", region: "Otago", country: "New Zealand", countryCode: "NZ", currency: "NZD", colIndex: 105, ppp: 0.85, inflation: 2.8 },
  { id: "au-brisbane", city: "Brisbane", region: "QLD", country: "Australia", countryCode: "AU", currency: "AUD", colIndex: 102, ppp: 0.9, inflation: 3.2 },
  { id: "au-gold-coast", city: "Gold Coast", region: "QLD", country: "Australia", countryCode: "AU", currency: "AUD", colIndex: 100, ppp: 0.9, inflation: 3.2 },
  { id: "au-perth", city: "Perth", region: "WA", country: "Australia", countryCode: "AU", currency: "AUD", colIndex: 98, ppp: 0.9, inflation: 3.2 },
  { id: "nz-wellington", city: "Wellington", region: "Wellington", country: "New Zealand", countryCode: "NZ", currency: "NZD", colIndex: 98, ppp: 0.85, inflation: 2.8 },
  { id: "au-adelaide", city: "Adelaide", region: "SA", country: "Australia", countryCode: "AU", currency: "AUD", colIndex: 94, ppp: 0.9, inflation: 3.2 },
  { id: "au-hobart", city: "Hobart", region: "TAS", country: "Australia", countryCode: "AU", currency: "AUD", colIndex: 92, ppp: 0.9, inflation: 3.2 },
  { id: "nz-christchurch", city: "Christchurch", region: "Canterbury", country: "New Zealand", countryCode: "NZ", currency: "NZD", colIndex: 92, ppp: 0.85, inflation: 2.8 },

  // ---- Latin America & Caribbean ----
  { id: "pr-san-juan", city: "San Juan", region: "", country: "Puerto Rico", countryCode: "PR", currency: "USD", colIndex: 92, ppp: 0.9, inflation: 3 },
  { id: "mx-mexico-city", city: "Mexico City", region: "Mexico City", country: "Mexico", countryCode: "MX", currency: "MXN", colIndex: 52, ppp: 0.48, inflation: 4.2, aliases: ["CDMX", "Ciudad de Mexico", "DF"], popular: true },
  { id: "uy-montevideo", city: "Montevideo", region: "Montevideo", country: "Uruguay", countryCode: "UY", currency: "UYU", colIndex: 52, ppp: 0.6, inflation: 5 },
  { id: "cr-san-jose", city: "San José", region: "San José", country: "Costa Rica", countryCode: "CR", currency: "CRC", colIndex: 52, ppp: 0.55, inflation: 2 },
  { id: "mx-monterrey", city: "Monterrey", region: "Nuevo León", country: "Mexico", countryCode: "MX", currency: "MXN", colIndex: 50, ppp: 0.48, inflation: 4.2 },
  { id: "pa-panama-city", city: "Panama City", region: "Panamá", country: "Panama", countryCode: "PA", currency: "USD", colIndex: 50, ppp: 0.5, inflation: 1.5, aliases: ["Ciudad de Panama"] },
  { id: "br-sao-paulo", city: "São Paulo", region: "São Paulo", country: "Brazil", countryCode: "BR", currency: "BRL", colIndex: 48, ppp: 0.42, inflation: 4.4, aliases: ["Sampa", "GRU"] },
  { id: "mx-playa-del-carmen", city: "Playa del Carmen", region: "Quintana Roo", country: "Mexico", countryCode: "MX", currency: "MXN", colIndex: 48, ppp: 0.48, inflation: 4.2, aliases: ["Riviera Maya"] },
  { id: "cl-santiago", city: "Santiago", region: "Santiago Metropolitan", country: "Chile", countryCode: "CL", currency: "CLP", colIndex: 48, ppp: 0.5, inflation: 3.8 },
  { id: "mx-guadalajara", city: "Guadalajara", region: "Jalisco", country: "Mexico", countryCode: "MX", currency: "MXN", colIndex: 46, ppp: 0.48, inflation: 4.2, aliases: ["GDL"] },
  { id: "br-rio-de-janeiro", city: "Rio de Janeiro", region: "Rio de Janeiro", country: "Brazil", countryCode: "BR", currency: "BRL", colIndex: 46, ppp: 0.42, inflation: 4.4, aliases: ["Rio"] },
  { id: "mx-queretaro", city: "Querétaro", region: "Querétaro", country: "Mexico", countryCode: "MX", currency: "MXN", colIndex: 44, ppp: 0.48, inflation: 4.2 },
  { id: "mx-tijuana", city: "Tijuana", region: "Baja California", country: "Mexico", countryCode: "MX", currency: "MXN", colIndex: 44, ppp: 0.48, inflation: 4.2 },
  { id: "ar-buenos-aires", city: "Buenos Aires", region: "Buenos Aires", country: "Argentina", countryCode: "AR", currency: "ARS", colIndex: 42, ppp: 0.4, inflation: 90, aliases: ["Palermo", "EZE"] },
  { id: "br-florianopolis", city: "Florianópolis", region: "Santa Catarina", country: "Brazil", countryCode: "BR", currency: "BRL", colIndex: 42, ppp: 0.42, inflation: 4.4, aliases: ["Floripa"] },
  { id: "ec-quito", city: "Quito", region: "Pichincha", country: "Ecuador", countryCode: "EC", currency: "USD", colIndex: 42, ppp: 0.45, inflation: 2 },
  { id: "gt-guatemala-city", city: "Guatemala City", region: "Guatemala", country: "Guatemala", countryCode: "GT", currency: "GTQ", colIndex: 42, ppp: 0.42, inflation: 4, aliases: ["Ciudad de Guatemala"] },
  { id: "pe-lima", city: "Lima", region: "Lima", country: "Peru", countryCode: "PE", currency: "PEN", colIndex: 40, ppp: 0.4, inflation: 2.5, aliases: ["Miraflores"] },
  { id: "co-bogota", city: "Bogotá", region: "Bogotá", country: "Colombia", countryCode: "CO", currency: "COP", colIndex: 40, ppp: 0.34, inflation: 6.5 },
  { id: "co-medellin", city: "Medellín", region: "Antioquia", country: "Colombia", countryCode: "CO", currency: "COP", colIndex: 38, ppp: 0.34, inflation: 6.5, aliases: ["El Poblado"] },
  { id: "br-belo-horizonte", city: "Belo Horizonte", region: "Minas Gerais", country: "Brazil", countryCode: "BR", currency: "BRL", colIndex: 38, ppp: 0.42, inflation: 4.4, aliases: ["BH"] },
  { id: "co-cartagena", city: "Cartagena", region: "Bolívar", country: "Colombia", countryCode: "CO", currency: "COP", colIndex: 34, ppp: 0.34, inflation: 6.5 },
];

export const POPULAR_CITIES: CityRecord[] = CITIES.filter((city) => city.popular);

export const DEFAULT_CITY_A_ID = "us-new-york-ny";
export const DEFAULT_CITY_B_ID = "pt-lisbon";

const BY_ID: Map<string, CityRecord> = new Map(CITIES.map((city) => [city.id, city]));

export function getCityById(id: string): CityRecord | undefined {
  return BY_ID.get(id.trim().toLowerCase());
}

/**
 * Currency identity for a city.
 *
 * `currency` on each record is already the ISO 4217 code, so the code is read
 * straight off the record rather than duplicated into a second field that
 * could drift out of sync with it. The symbol is derived from the code through
 * `Intl` — that is always right for the current runtime's CLDR data, where a
 * hand-maintained symbol column would be 272 more strings to get wrong.
 */
export function cityCurrency(city: CityRecord): {
  code: string;
  symbol: string;
} {
  return { code: city.currency, symbol: currencySymbol(city.currency) };
}

/** Distinct ISO 4217 codes used by the dataset. */
export const DATASET_CURRENCIES: string[] = Array.from(
  new Set(CITIES.map((city) => city.currency))
).sort();

/**
 * Headline inflation of the economy that issues a currency.
 *
 * A budget line denominated in rupees is a price set in India, so it climbs at
 * Indian inflation no matter which city the household lives in or which
 * currency the projection is shown in. Inflation is a country-level figure in
 * this dataset, so the first city using the code answers for the whole economy.
 *
 * The euro is the awkward case — one currency over twenty economies with
 * genuinely different prints. The median of its members is used rather than
 * whichever eurozone city happens to sort first, which would otherwise make
 * the answer depend on the order of an unrelated list.
 */
const CURRENCY_INFLATION: Map<string, number> = (() => {
  const byCurrency = new Map<string, number[]>();
  for (const city of CITIES) {
    const seen = byCurrency.get(city.currency) ?? [];
    if (!seen.includes(city.inflation)) seen.push(city.inflation);
    byCurrency.set(city.currency, seen);
  }
  const out = new Map<string, number>();
  for (const [code, rates] of byCurrency) {
    const sorted = [...rates].sort((a, b) => a - b);
    out.set(code, sorted[Math.floor(sorted.length / 2)]);
  }
  return out;
})();

/** Falls back to a middling global figure for a code outside the dataset. */
export function inflationForCurrency(currency: string): number {
  return CURRENCY_INFLATION.get(currency?.toUpperCase()) ?? 3;
}

/** Lowercase, strip combining marks, collapse surrounding space. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Punctuation-insensitive form, so "st louis" can reach "St. Louis, MO". */
function loosen(value: string): string {
  return value.replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Match-quality tiers, best first. Kept in one table so the ranking stays easy
 * to reason about: the city name dominates, then region/country, then the
 * softer signals (partial aliases, currency, whole-label text).
 *
 * Exact hits on an alias, a region or a country outrank weaker city-name
 * matches on purpose. Someone typing "LA" or "NY" typed a complete, curated
 * token and means Los Angeles and New York — not Lagos and Albany, which match
 * only incidentally. Aliases are deliberately short and curated, so an exact
 * one is the most confident signal available after a full city-name match.
 */
const SCORE = {
  cityExact: 100,
  aliasExact: 95,
  cityPrefix: 90,
  regionExact: 84,
  countryExact: 82,
  cityContains: 78,
  regionPrefix: 62,
  countryPrefix: 60,
  regionContains: 48,
  countryContains: 46,
  aliasPrefix: 36,
  aliasContains: 32,
  currencyExact: 28,
  currencyContains: 24,
  labelContains: 20,
};

interface SearchEntry {
  record: CityRecord;
  city: string;
  region: string;
  country: string;
  currency: string;
  aliases: string[];
  /** "new york ny united states", punctuation flattened. */
  label: string;
}

const SEARCH_INDEX: SearchEntry[] = CITIES.map((record) => {
  const city = normalize(record.city);
  const region = normalize(record.region);
  const country = normalize(record.country);
  const aliases = (record.aliases ?? []).map(normalize);
  return {
    record,
    city,
    region,
    country,
    currency: normalize(record.currency),
    aliases,
    label: loosen([city, region, country, ...aliases].join(" ")),
  };
});

/** Highest tier this entry matches for a non-empty normalized query, or 0. */
function scoreEntry(entry: SearchEntry, query: string, looseQuery: string): number {
  if (entry.city === query) return SCORE.cityExact;
  if (entry.aliases.includes(query)) return SCORE.aliasExact;
  if (entry.city.startsWith(query)) return SCORE.cityPrefix;
  if (entry.region === query) return SCORE.regionExact;
  if (entry.country === query) return SCORE.countryExact;
  if (entry.city.includes(query)) return SCORE.cityContains;
  if (entry.region.startsWith(query)) return SCORE.regionPrefix;
  if (entry.country.startsWith(query)) return SCORE.countryPrefix;
  if (entry.region.includes(query)) return SCORE.regionContains;
  if (entry.country.includes(query)) return SCORE.countryContains;

  let aliasScore = 0;
  for (const alias of entry.aliases) {
    if (alias.startsWith(query)) {
      aliasScore = Math.max(aliasScore, SCORE.aliasPrefix);
    } else if (alias.includes(query)) {
      aliasScore = Math.max(aliasScore, SCORE.aliasContains);
    }
  }
  if (aliasScore > 0) return aliasScore;

  if (entry.currency === query) return SCORE.currencyExact;
  if (entry.currency.includes(query)) return SCORE.currencyContains;
  if (looseQuery.length > 0 && entry.label.includes(looseQuery)) return SCORE.labelContains;
  return 0;
}

/**
 * Rank a typeahead query against the dataset. Pure and synchronous.
 *
 * Case- and diacritic-insensitive substring search across city, region,
 * country, currency and aliases, so "zurich" finds Zürich and "sao paulo"
 * finds São Paulo. Ties break on `popular`, then higher `colIndex`, then city
 * name, then `id` — the ordering is fully deterministic.
 *
 * An empty or whitespace-only query returns the popular set.
 */
export function searchCities(query: string, limit = 8): CityRecord[] {
  const max = Math.max(0, Math.floor(limit));
  if (max === 0) return [];

  const normalized = normalize(query);
  if (normalized.length === 0) return POPULAR_CITIES.slice(0, max);

  const looseQuery = loosen(normalized);
  const matches: { entry: SearchEntry; score: number }[] = [];
  for (const entry of SEARCH_INDEX) {
    const score = scoreEntry(entry, normalized, looseQuery);
    if (score > 0) matches.push({ entry, score });
  }

  matches.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;

    const aPopular = a.entry.record.popular === true ? 1 : 0;
    const bPopular = b.entry.record.popular === true ? 1 : 0;
    if (aPopular !== bPopular) return bPopular - aPopular;

    if (a.entry.record.colIndex !== b.entry.record.colIndex) {
      return b.entry.record.colIndex - a.entry.record.colIndex;
    }

    if (a.entry.city !== b.entry.city) return a.entry.city < b.entry.city ? -1 : 1;
    return a.entry.record.id < b.entry.record.id ? -1 : 1;
  });

  return matches.slice(0, max).map((match) => match.entry.record);
}
