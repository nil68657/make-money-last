/**
 * Verification against the *deployed* GitHub Pages site.
 *
 * `verify-app.mjs` drives a local server, where the app is served from the root
 * and every asset resolves trivially. Production is a static export served under
 * a /make-money-last base path, which is exactly the configuration that breaks
 * on its own — a wrong assetPrefix yields a page that returns HTTP 200 and looks
 * like unstyled HTML. So this script re-checks the things a base path can break:
 * stylesheet and script resolution, hydration, and the client-only FX fetch,
 * which is blocked in CI sandboxes and only ever runs for real in a browser
 * pointed at the public origin.
 *
 * Two passes:
 *   1. "live"    — network untouched. Records whether open.er-api.com actually
 *                  answers a browser on this origin, or is refused by CORS.
 *   2. "fx-down" — the rates endpoint is aborted at the network layer. The app
 *                  must still render and calculate from the bundled snapshot.
 *
 * Usage:  node scripts/verify-live.mjs [--base <url>] [--pass live|fx-down]
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LOCAL_BROWSERS = path.resolve(import.meta.dirname, "..", ".playwright-browsers");
if (existsSync(LOCAL_BROWSERS)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = LOCAL_BROWSERS;
}

const { chromium } = await import("playwright");

const argv = process.argv.slice(2);
const readFlag = (name, fallback) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? fallback : argv[index + 1];
};

const BASE_URL = readFlag("base", "https://nil68657.github.io/make-money-last/");
const ONLY_PASS = readFlag("pass", null);
const SHOTS_DIR = path.resolve(import.meta.dirname, "..", "screenshots");
const REPORT = path.resolve(import.meta.dirname, "verify-live.report.json");

const DESKTOP = { width: 1440, height: 1000 };
const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 1000 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-375", width: 375, height: 900 },
];

const FX_ENDPOINT_PATTERN = /open\.er-api\.com/;

/**
 * Third-party noise that says nothing about app health. GitHub Pages injects
 * nothing, so this stays deliberately short — anything else is a real finding.
 */
const IGNORED_CONSOLE = [/Download the React DevTools/i];

const state = {
  steps: [],
  consoleErrors: [],
  consoleWarnings: [],
  pageErrors: [],
  failedRequests: [],
  fx: { attempted: false, ok: false, status: null, failure: null, corsBlocked: false },
};

let currentStep = "startup";
let currentPass = "live";
/** Set only by the pass that severs the rates endpoint on purpose. */
let expectFxFailure = false;

const log = (message) => process.stdout.write(`${message}\n`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function step(name, fn) {
  currentStep = name;
  const startedAt = Date.now();
  try {
    const detail = await fn();
    state.steps.push({ pass: currentPass, name, status: "pass", ms: Date.now() - startedAt, detail });
    log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
    return true;
  } catch (error) {
    const message = error?.message?.split("\n")[0] ?? String(error);
    state.steps.push({ pass: currentPass, name, status: "fail", ms: Date.now() - startedAt, error: message });
    log(`  FAIL  ${name}\n        ${message}`);
    return false;
  }
}

const shot = (page, name, fullPage = false) =>
  page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`), fullPage });

/** Types a query, waits for the listbox to filter, commits with the keyboard. */
async function pickCity(page, label, query, expectedText) {
  const input = page.getByRole("combobox", { name: label });
  await input.click();

  const listbox = page.locator('ul[role="listbox"]').first();
  await listbox.waitFor({ state: "visible", timeout: 8000 });

  const before = await listbox.locator('li[role="option"]').count();
  await input.pressSequentially(query, { delay: 25 });

  const options = listbox.locator('li[role="option"]');
  await options.first().waitFor({ state: "visible", timeout: 8000 });
  const after = await options.count();

  const firstText = (await options.first().innerText()).replace(/\s+/g, " ").trim();
  assert(
    firstText.toLowerCase().includes(expectedText.toLowerCase()),
    `"${label}" top hit for "${query}" was "${firstText}", expected "${expectedText}"`
  );
  assert(
    await listbox.locator("mark").count(),
    `"${label}" did not highlight the matched substring`
  );

  await input.press("ArrowDown");
  await input.press("Enter");
  await listbox.waitFor({ state: "hidden", timeout: 8000 });

  return { value: await input.inputValue(), before, after, firstText };
}

/** The currency symbol rendered inside a money field. */
const moneyPrefix = (page, label) =>
  page
    .getByLabel(label, { exact: false })
    .first()
    .evaluate(
      (el) => el.parentElement?.querySelector("span[aria-hidden]")?.textContent?.trim() ?? ""
    );

async function setMoney(page, label, amount) {
  const field = page.getByLabel(label, { exact: false }).first();
  await field.click();
  await field.press("ControlOrMeta+a");
  await field.pressSequentially(String(amount), { delay: 10 });
  await field.blur();
  return field.inputValue();
}

/**
 * Recharts reveals a series by animating the width of a clip rect while the
 * path itself is already full length. Geometry therefore looks final long
 * before the chart does, so anything that screenshots has to wait for the clip
 * to stop moving rather than for the path to exist.
 */
async function settleChart(page, timeoutMs = 6000) {
  const readClip = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll(".recharts-wrapper clipPath rect")).reduce(
        (max, rect) => Math.max(max, Number(rect.getAttribute("width") ?? 0)),
        0
      )
    );

  const started = Date.now();
  let previous = -1;
  while (Date.now() - started < timeoutMs) {
    const width = await readClip();
    if (width > 0 && width === previous) return Math.round(width);
    previous = width;
    await page.waitForTimeout(250);
  }
  return Math.round(previous);
}

async function calculate(page) {
  await page.getByRole("button", { name: /calculate|update projection/i }).first().click();
  // A skeleton stands in for a beat before results mount. Sitting through it
  // avoids reading the *previous* projection's controls, which are still on
  // screen at the moment of the click when re-running from the edit overlay.
  await page.waitForTimeout(900);
  await page
    .getByRole("button", { name: /^Assumptions$/ })
    .first()
    .waitFor({ state: "visible", timeout: 20000 });
  await settleChart(page);
}

const chartTab = (page, name) =>
  page.getByRole("group", { name: "Chart view" }).getByRole("button", { name: new RegExp(name, "i") });

/**
 * A chart counts as drawn only when its *data marks* have real geometry. Axes,
 * grid lines and the depletion reference line are all paths too, so counting
 * paths would pass a chart that rendered nothing but its own frame.
 */
async function chartGeometry(page) {
  const svg = page.locator(".recharts-surface").first();
  await svg.waitFor({ state: "visible", timeout: 15000 });
  const box = await svg.boundingBox();
  const series = await page.evaluate(() => {
    const marks = Array.from(
      document.querySelectorAll(
        ".recharts-surface .recharts-area-curve," +
          ".recharts-surface .recharts-line-curve," +
          ".recharts-surface .recharts-rectangle," +
          ".recharts-surface .recharts-bar-rectangle path"
      )
    );
    return marks
      .map((mark) => {
        const b = mark.getBBox();
        return { w: Math.round(b.width), h: Math.round(b.height) };
      })
      .filter((m) => m.w > 4 && m.h > 0);
  });
  return {
    width: Math.round(box?.width ?? 0),
    height: Math.round(box?.height ?? 0),
    drawn: series.length,
    marks: series
      .slice(0, 4)
      .map((s) => `${s.w}×${s.h}`)
      .join(" "),
  };
}

function attachListeners(page) {
  page.on("console", (message) => {
    const text = message.text();
    if (IGNORED_CONSOLE.some((p) => p.test(text))) return;
    // A deliberately severed endpoint surfaces a browser-level console error
    // that no application code can suppress. Only that one is exempt.
    if (expectFxFailure && FX_ENDPOINT_PATTERN.test(`${text} ${message.location()?.url ?? ""}`)) return;
    const entry = { pass: currentPass, step: currentStep, text: text.slice(0, 400) };
    if (message.type() === "error") state.consoleErrors.push(entry);
    if (message.type() === "warning") state.consoleWarnings.push(entry);
  });

  page.on("pageerror", (error) => {
    state.pageErrors.push({
      pass: currentPass,
      step: currentStep,
      text: `${error.name}: ${error.message}`.slice(0, 400),
    });
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (FX_ENDPOINT_PATTERN.test(request.url())) {
      state.fx.attempted = true;
      state.fx.failure = failure;
      state.fx.corsBlocked = /ERR_FAILED|CORS/i.test(failure) && !expectFxFailure;
      if (expectFxFailure) return;
    }
    if (/ERR_ABORTED/.test(failure)) return;
    state.failedRequests.push({
      pass: currentPass,
      step: currentStep,
      text: `${request.method()} ${request.url()} — ${failure}`,
    });
  });

  page.on("response", (response) => {
    const url = response.url();
    if (FX_ENDPOINT_PATTERN.test(url)) {
      state.fx.attempted = true;
      state.fx.status = response.status();
      state.fx.ok = response.ok();
      return;
    }
    if (response.status() >= 400) {
      state.failedRequests.push({
        pass: currentPass,
        step: currentStep,
        text: `${response.status()} ${url}`,
      });
    }
  });
}

// ---------------------------------------------------------------- pass: live
async function runLivePass(browser) {
  currentPass = "live";
  expectFxFailure = false;
  log(`\n=== PASS 1: live network — ${BASE_URL}\n`);

  const context = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  const page = await context.newPage();
  attachListeners(page);

  await step("live site returns 200", async () => {
    const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert(response, "no response");
    assert(response.status() === 200, `expected 200, got ${response.status()}`);
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    return `HTTP ${response.status()}`;
  });

  await step("page is styled, not raw HTML", async () => {
    const styles = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const sheets = Array.from(document.styleSheets).length;
      const rules = Array.from(document.styleSheets).reduce((n, s) => {
        try {
          return n + (s.cssRules?.length ?? 0);
        } catch {
          return n;
        }
      }, 0);
      return { bg: body.backgroundColor, font: body.fontFamily, sheets, rules };
    });
    assert(
      styles.bg !== "rgba(0, 0, 0, 0)" && styles.bg !== "" && styles.bg !== "transparent",
      `body background is "${styles.bg}" — stylesheet did not load`
    );
    assert(styles.rules > 100, `only ${styles.rules} CSS rules parsed — stylesheet is truncated`);
    assert(/inter|__inter|system-ui|sans/i.test(styles.font), `unexpected font: ${styles.font}`);
    return `bg ${styles.bg}, ${styles.rules} rules, ${styles.sheets} sheet(s)`;
  });

  await step("assets resolve under the base path", async () => {
    const assets = await page.evaluate(() =>
      Array.from(document.querySelectorAll("link[rel=stylesheet], script[src]")).map(
        (el) => el.getAttribute("href") || el.getAttribute("src")
      )
    );
    const prefixed = assets.filter((a) => a?.startsWith("/make-money-last/"));
    assert(assets.length > 0, "no stylesheet or script tags found");
    assert(
      prefixed.length === assets.length,
      `${assets.length - prefixed.length} asset(s) missing the base path: ${assets
        .filter((a) => !a?.startsWith("/make-money-last/"))
        .join(", ")}`
    );
    return `${assets.length} assets, all base-path prefixed`;
  });

  await step("React hydrated (client interactivity live)", async () => {
    const input = page.getByRole("combobox", { name: "Current city" });
    await input.click();
    const listbox = page.locator('ul[role="listbox"]').first();
    await listbox.waitFor({ state: "visible", timeout: 10000 });
    const count = await listbox.locator('li[role="option"]').count();
    await input.press("Escape");
    assert(count > 0, "combobox opened but listed nothing");
    return `${count} popular cities on focus`;
  });

  await step("FX: live rates fetched from the browser", async () => {
    // The provider fires the fetch in an effect after mount; give it the
    // module's own 6s timeout plus headroom before reading the verdict.
    await page.waitForTimeout(7000);
    const note = await page
      .locator("p", { hasText: /rates as of|bundled offline snapshot/i })
      .first()
      .innerText()
      .catch(() => "");
    state.fx.note = note.replace(/\s+/g, " ").trim();
    state.fx.usingFallback = /bundled offline snapshot/i.test(note);

    if (!state.fx.attempted) return "no request observed (served from localStorage cache)";
    assert(
      state.fx.ok || state.fx.failure,
      `FX request produced neither a response nor a failure (status ${state.fx.status})`
    );
    return state.fx.ok
      ? `HTTP ${state.fx.status} — live rates accepted; note reads "${state.fx.note}"`
      : `blocked (${state.fx.failure}) — note reads "${state.fx.note}"`;
  });

  await step("rates indicator matches the actual source", async () => {
    const note = state.fx.note ?? "";
    assert(note.length > 0, "no FX indicator rendered at all");
    if (state.fx.ok) {
      assert(
        /live rates as of/i.test(note),
        `fetch succeeded but the UI still reads "${note}"`
      );
    } else if (state.fx.attempted) {
      assert(
        /bundled offline snapshot/i.test(note),
        `fetch failed but the UI claims live rates: "${note}"`
      );
    }
    return note;
  });

  // ------------------------------------------------------- currency contract
  await step("destination currency drives the income field (Tokyo → ¥)", async () => {
    await pickCity(page, "New city", "Tokyo", "Tokyo");
    await page.waitForTimeout(400);
    const symbol = await moneyPrefix(page, "Pre-tax household income");
    const label = await page
      .locator("label", { hasText: /Pre-tax household income/i })
      .first()
      .innerText();
    assert(symbol === "¥", `income symbol was "${symbol}", expected "¥"`);
    assert(/JPY/.test(label), `income label was "${label}", expected it to name JPY`);
    return `symbol ${symbol}, label "${label.replace(/\s+/g, " ").trim()}"`;
  });

  await step("destination currency updates again (London → £)", async () => {
    await pickCity(page, "New city", "London", "London");
    await page.waitForTimeout(400);
    const symbol = await moneyPrefix(page, "Pre-tax household income");
    const label = await page
      .locator("label", { hasText: /Pre-tax household income/i })
      .first()
      .innerText();
    assert(symbol === "£", `income symbol was "${symbol}", expected "£"`);
    assert(/GBP/.test(label), `income label was "${label}", expected it to name GBP`);
    return `symbol ${symbol}, label "${label.replace(/\s+/g, " ").trim()}"`;
  });

  await step("savings field stays in the origin currency", async () => {
    const symbol = await moneyPrefix(page, "Current savings");
    assert(symbol === "$", `savings symbol was "${symbol}", expected "$" for the US origin`);
    return `savings ${symbol}, income £ — the two fields are independently denominated`;
  });

  // ---------------------------------------------------------- the main flow
  await step("full flow: pick cities, enter income, calculate", async () => {
    const a = await pickCity(page, "Current city", "San Fran", "San Francisco");
    const b = await pickCity(page, "New city", "Tokyo", "Tokyo");
    assert(a.after < a.before + 1, "current-city list did not narrow while typing");
    await setMoney(page, "Current savings", 400000);
    const income = await setMoney(page, "Pre-tax household income", 22000000);
    await shot(page, "live-01-landing-desktop", true);
    await calculate(page);
    return `${a.value} → ${b.value}, income ${income}`;
  });

  await step("results render with charts at real dimensions", async () => {
    const geo = await chartGeometry(page);
    assert(geo.width > 400, `chart SVG is only ${geo.width}px wide`);
    assert(geo.height > 180, `chart SVG is only ${geo.height}px tall`);
    assert(geo.drawn >= 2, `chart drew ${geo.drawn} data series, expected one per city`);
    await shot(page, "live-02-results-desktop", true);
    await page
      .locator(".recharts-wrapper")
      .first()
      .screenshot({ path: path.join(SHOTS_DIR, "live-02b-trajectory-chart.png") });
    return `SVG ${geo.width}×${geo.height}, ${geo.drawn} series at ${geo.marks}`;
  });

  await step("every projected figure is in the destination currency (JPY)", async () => {
    const cards = await page.locator('[data-testid="metric-card"]').allInnerTexts();
    assert(cards.length > 0, "no metric cards rendered");
    const text = cards.join(" | ");
    assert(/¥/.test(text), `no yen sign anywhere in the metric cards: ${text.slice(0, 200)}`);
    assert(
      !/\$[\d,]/.test(text),
      `a dollar amount leaked into a JPY projection: ${text.slice(0, 200)}`
    );
    return `${cards.length} cards, all yen-denominated`;
  });

  await step("JPY renders with no decimal places", async () => {
    const body = await page.locator("main").innerText();
    // A decimal is only legitimate in compact notation ("¥63.3M"), where the
    // digit after the point is a tenth of a million, not a tenth of a yen.
    const offenders = body.match(/¥\s?[\d,]+\.\d+(?![KMBT])/g) ?? [];
    assert(offenders.length === 0, `JPY shown with decimals: ${offenders.slice(0, 5).join(", ")}`);
    const whole = (body.match(/¥\s?[\d,]{4,}(?!\.)/g) ?? []).slice(0, 3);
    assert(whole.length > 0, "no full-precision yen amount found to check");
    return `whole yen only, e.g. ${whole.join(", ")}`;
  });

  await step("chart axes are labelled in the destination currency", async () => {
    // Recharts ticks are SVG <text>; innerText is an HTMLElement-only API.
    const ticks = await page
      .locator(".recharts-yAxis .recharts-cartesian-axis-tick-value")
      .allTextContents();
    assert(ticks.length > 0, "no y-axis ticks rendered");
    const money = ticks.filter((t) => /[¥]/.test(t));
    assert(
      money.length > 0,
      `y-axis ticks are not in yen: ${JSON.stringify(ticks.slice(0, 6))}`
    );
    const foreign = ticks.filter((t) => /[$£€₩₹]/.test(t));
    assert(foreign.length === 0, `a non-destination currency is on the axis: ${foreign.join(", ")}`);
    return JSON.stringify(ticks.slice(0, 5));
  });

  await step("savings converted into the destination currency", async () => {
    const note = await page
      .locator("p", { hasText: /converted|exchange rate/i })
      .first()
      .innerText()
      .catch(() => "");
    assert(note.length > 0, "no explanation of the savings conversion on the results page");
    assert(/¥/.test(note), `conversion note does not state a yen figure: "${note}"`);
    return note.replace(/\s+/g, " ").trim().slice(0, 140);
  });

  await step("switching destination re-denominates everything (Seoul → ₩ → Tokyo)", async () => {
    await page.getByRole("button", { name: /^Edit$/ }).first().click();
    await page.getByRole("dialog").first().waitFor({ state: "visible", timeout: 10000 });
    await pickCity(page, "New city", "Seoul", "Seoul");
    await calculate(page);

    const won = (await page.locator('[data-testid="metric-card"]').allInnerTexts()).join(" | ");
    assert(/₩/.test(won), `results did not switch to won: ${won.slice(0, 160)}`);
    assert(!/¥/.test(won), `yen survived the switch to Seoul: ${won.slice(0, 160)}`);

    const body = await page.locator("main").innerText();
    const offenders = body.match(/₩\s?[\d,]+\.\d+(?![KMBT])/g) ?? [];
    assert(offenders.length === 0, `KRW shown with decimals: ${offenders.slice(0, 5).join(", ")}`);

    const ticks = await page
      .locator(".recharts-yAxis .recharts-cartesian-axis-tick-value")
      .allTextContents();
    assert(
      ticks.some((t) => /₩/.test(t)),
      `y-axis did not follow the destination: ${JSON.stringify(ticks.slice(0, 5))}`
    );
    await shot(page, "live-02c-results-krw", true);

    // Back to Tokyo, so the rest of the pass reads a single known currency and
    // the round trip itself is proven rather than assumed.
    await page.getByRole("button", { name: /^Edit$/ }).first().click();
    await page.getByRole("dialog").first().waitFor({ state: "visible", timeout: 10000 });
    await pickCity(page, "New city", "Tokyo", "Tokyo");
    await calculate(page);
    const yen = (await page.locator('[data-testid="metric-card"]').allInnerTexts()).join(" | ");
    assert(/¥/.test(yen) && !/₩/.test(yen), `switching back to Tokyo left won behind: ${yen.slice(0, 160)}`);

    const whole = (body.match(/₩\s?[\d,]{4,}(?!\.)/g) ?? []).slice(0, 2);
    return `won axis ${JSON.stringify(ticks.slice(0, 3))}, whole won e.g. ${whole.join(", ")}, round trip clean`;
  });

  // -------------------------------------------------------------- chart tabs
  await step("chart tab: Categories", async () => {
    await chartTab(page, "Categories").click();
    await settleChart(page);
    const geo = await chartGeometry(page);
    assert(geo.drawn >= 2, `categories chart drew ${geo.drawn} bars`);
    await shot(page, "live-03-chart-categories");
    return `${geo.width}×${geo.height}, ${geo.drawn} bars at ${geo.marks}`;
  });

  await step("chart tab: Buying power", async () => {
    await chartTab(page, "Buying power").click();
    await settleChart(page);
    const geo = await chartGeometry(page);
    assert(geo.drawn >= 2, `buying-power chart drew ${geo.drawn} series`);
    return `${geo.width}×${geo.height}, ${geo.drawn} series at ${geo.marks}`;
  });

  await step("nominal vs real toggle switches the series", async () => {
    const group = page.getByRole("group").filter({ has: page.getByRole("button", { name: /^Nominal/ }) }).first();
    const before = await page.locator(".recharts-surface").first().innerHTML();

    await group.getByRole("button", { name: /^Real/ }).click();
    await settleChart(page);
    const realLegend = await page.locator("text=/— real/i").count();

    await group.getByRole("button", { name: /^Nominal/ }).click();
    await settleChart(page);
    const after = await page.locator(".recharts-surface").first().innerHTML();
    const nominalLegend = await page.locator("text=/— nominal/i").count();

    assert(before !== after, "toggling nominal/real did not change the chart");
    assert(realLegend > 0 && nominalLegend > 0, "legend did not follow the toggle");
    await shot(page, "live-04-buying-power-nominal");
    return `real legend ${realLegend}, nominal legend ${nominalLegend}, geometry changed`;
  });

  // The inflation-deflated series and the PPP-adjusted one used to be the same
  // number under two names. If they ever draw identically again, the price
  // level has fallen out of the comparison.
  await step("international-dollars lens differs from the real one", async () => {
    const group = page
      .getByRole("group")
      .filter({ has: page.getByRole("button", { name: /^Nominal/ }) })
      .first();

    await group.getByRole("button", { name: /^Real value/i }).click();
    await settleChart(page);
    const realHtml = await page.locator(".recharts-surface").first().innerHTML();

    await group.getByRole("button", { name: /International dollars/i }).click();
    await settleChart(page);
    const intlHtml = await page.locator(".recharts-surface").first().innerHTML();
    const intlLegend = await page.locator("text=/— international/i").count();

    assert(realHtml !== intlHtml, "the international lens drew the same series as real");
    assert(intlLegend > 0, "legend did not name the international series");
    await shot(page, "live-05-buying-power-intl");
    return `intl legend ${intlLegend}, series differ from real`;
  });

  await step("all three balance lenses are labelled", async () => {
    const found = [];
    for (const label of ["Nominal", "Real, local prices", "International dollars"]) {
      const count = await page.getByText(label, { exact: true }).count();
      assert(count > 0, `no "${label}" label under the buying-power chart`);
      found.push(label);
    }
    const stale = await page.getByText(/PPP-adjusted/i).count();
    assert(stale === 0, "the misleading PPP-adjusted label is still on the page");
    return found.join(" / ");
  });

  await step("metric detail overlay opens and closes", async () => {
    await chartTab(page, "Runway").click();
    await page.waitForTimeout(400);
    const card = page.locator('[data-testid="metric-card"]').first();
    await card.click();
    const dialog = page.getByRole("dialog").first();
    await dialog.waitFor({ state: "visible", timeout: 8000 });
    const title = (await dialog.innerText()).replace(/\s+/g, " ").trim();
    assert(title.length > 40, `detail overlay looks empty: "${title}"`);
    await shot(page, "live-05-detail-overlay");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 8000 });
    return `opened "${title.slice(0, 60)}…", Escape closed it`;
  });

  await step("dark mode applies", async () => {
    const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.getByRole("button", { name: /theme|dark|light/i }).first().click();
    await settleChart(page);
    const after = await page.evaluate(() => ({
      bg: getComputedStyle(document.body).backgroundColor,
      cls: document.documentElement.className,
    }));
    assert(after.bg !== before, `background did not change: still ${before}`);
    await shot(page, "live-06-results-dark", true);
    await page.getByRole("button", { name: /theme|dark|light/i }).first().click();
    await page.waitForTimeout(500);
    return `${before} → ${after.bg}`;
  });

  // ------------------------------------------------------------- responsive
  for (const vp of VIEWPORTS) {
    await step(`screenshot: ${vp.name}`, async () => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await settleChart(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      await shot(page, `live-07-results-${vp.name}`, true);
      assert(overflow <= 2, `horizontal overflow of ${overflow}px at ${vp.width}px`);
      return `${vp.width}×${vp.height}, no horizontal overflow`;
    });
  }

  await step("landing page at each width", async () => {
    const sizes = [];
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(1400);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      assert(overflow <= 2, `landing overflows by ${overflow}px at ${vp.width}px`);
      await shot(page, `live-08-landing-${vp.name}`, true);
      sizes.push(vp.name);
    }
    return sizes.join(", ");
  });

  await context.close();
}

// ------------------------------------------------------------- pass: fx-down
async function runFxDownPass(browser) {
  currentPass = "fx-down";
  expectFxFailure = true;
  log(`\n=== PASS 2: rates endpoint severed — ${BASE_URL}\n`);

  const context = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  const page = await context.newPage();
  attachListeners(page);

  // Fresh context means an empty localStorage, so there is no cached snapshot
  // to hide behind: the app must genuinely fall back to the bundled table.
  await page.route(FX_ENDPOINT_PATTERN, (route) => route.abort("failed"));

  await step("[fx down] page still loads and hydrates", async () => {
    const started = Date.now();
    const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert(response.status() === 200, `expected 200, got ${response.status()}`);
    const input = page.getByRole("combobox", { name: "Current city" });
    await input.waitFor({ state: "visible", timeout: 20000 });

    // The markup is server-rendered, so the field is visible and clickable
    // before React has attached to it and a first click can land on nothing.
    // Retrying is the point of the check — becoming interactive is what is
    // being measured, not responding to the very first click.
    const listbox = page.locator('ul[role="listbox"]').first();
    let opened = false;
    for (let attempt = 0; attempt < 5 && !opened; attempt++) {
      await input.click();
      opened = await listbox
        .waitFor({ state: "visible", timeout: 4000 })
        .then(() => true)
        .catch(() => false);
    }
    assert(opened, "the city combobox never became interactive");
    await input.press("Escape");
    return `interactive in ${Date.now() - started}ms with the endpoint dead`;
  });

  await step("[fx down] app does not hang waiting on rates", async () => {
    // The fetch has a 6s abort; the UI must never be gated on it. Nothing may
    // be disabled or spinning once the endpoint has had longer than that.
    await page.waitForTimeout(8000);
    const cta = page.getByRole("button", { name: /calculate/i }).first();
    assert(await cta.isEnabled(), "the calculate button is still disabled after the fetch failed");
    const spinners = await page.locator(".animate-spin").count();
    assert(spinners === 0, `${spinners} spinner(s) still running`);
    return "CTA enabled, no spinners";
  });

  await step("[fx down] UI states that it is on the bundled snapshot", async () => {
    await pickCity(page, "New city", "Tokyo", "Tokyo");
    await page.waitForTimeout(500);
    const note = await page
      .locator("p", { hasText: /bundled offline snapshot|rates as of/i })
      .first()
      .innerText();
    assert(
      /bundled offline snapshot/i.test(note),
      `expected the fallback wording, got "${note.replace(/\s+/g, " ")}"`
    );
    assert(/live rates unavailable/i.test(note), `fallback note is not explicit: "${note}"`);
    await shot(page, "live-09-fx-fallback-note");
    return note.replace(/\s+/g, " ").trim();
  });

  await step("[fx down] full projection still calculates", async () => {
    await pickCity(page, "Current city", "San Fran", "San Francisco");
    await setMoney(page, "Current savings", 400000);
    await setMoney(page, "Pre-tax household income", 22000000);
    await calculate(page);

    const geo = await chartGeometry(page);
    assert(geo.drawn >= 2, `chart drew only ${geo.drawn} shapes on the fallback path`);

    const cards = await page.locator('[data-testid="metric-card"]').allInnerTexts();
    assert(cards.length > 0, "no metric cards on the fallback path");
    const text = cards.join(" | ");
    assert(/¥/.test(text), "projections are not in yen on the fallback path");
    assert(!/NaN|Infinity|undefined|—\s*—/.test(text), `broken figures on the fallback path: ${text.slice(0, 200)}`);

    await shot(page, "live-10-fx-fallback-results", true);
    return `${cards.length} cards, chart ${geo.width}×${geo.height}, all finite`;
  });

  await step("[fx down] the fallback rate is the bundled one", async () => {
    const note = await page
      .locator("p", { hasText: /1 USD = /i })
      .first()
      .innerText()
      .catch(() => "");
    assert(/1 USD = 151 JPY/.test(note.replace(/\s+/g, " ")), `unexpected fallback rate: "${note}"`);
    return note.replace(/\s+/g, " ").trim().slice(0, 90);
  });

  await context.close();
  expectFxFailure = false;
}

async function main() {
  await mkdir(SHOTS_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  if (ONLY_PASS !== "fx-down") await runLivePass(browser);
  if (ONLY_PASS !== "live") await runFxDownPass(browser);

  await browser.close();

  const failed = state.steps.filter((s) => s.status === "fail");
  const problems =
    failed.length + state.consoleErrors.length + state.pageErrors.length + state.failedRequests.length;

  log("\n────────────────────────────────────────────────────────");
  log(`  steps            ${state.steps.length - failed.length}/${state.steps.length} passed`);
  log(`  console errors   ${state.consoleErrors.length}`);
  log(`  console warnings ${state.consoleWarnings.length}`);
  log(`  page errors      ${state.pageErrors.length}`);
  log(`  failed requests  ${state.failedRequests.length}`);
  log(
    `  live FX          ${
      state.fx.ok
        ? `reachable (HTTP ${state.fx.status})`
        : state.fx.attempted
          ? `unreachable (${state.fx.failure})`
          : "not requested"
    }`
  );

  for (const list of [state.consoleErrors, state.pageErrors, state.failedRequests]) {
    for (const item of list) log(`    ! [${item.pass}] ${item.step}: ${item.text}`);
  }
  for (const item of state.consoleWarnings) log(`    ~ [${item.pass}] ${item.step}: ${item.text}`);

  await writeFile(
    REPORT,
    `${JSON.stringify({ baseUrl: BASE_URL, ranAt: new Date().toISOString(), ...state }, null, 2)}\n`
  );

  log(problems === 0 ? "\n  LIVE SITE VERIFIED\n" : `\n  ${problems} PROBLEM(S)\n`);
  process.exit(problems === 0 ? 0 : 1);
}

await main();
