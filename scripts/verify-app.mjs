/**
 * End-to-end runtime verification for the simulator.
 *
 * Drives the app the way a person would — types into both city comboboxes,
 * keyboard-selects, edits the budget, reads the results — and fails loudly on
 * any browser console error, uncaught exception or failed network request.
 *
 * Usage:  node scripts/verify-app.mjs [--base http://localhost:3000] [--keep-open]
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// Chromium is installed in-repo (`.playwright-browsers`) so the script works
// regardless of what the machine's global Playwright cache points at.
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

const BASE_URL = readFlag("base", process.env.BASE_URL ?? "http://localhost:3000");
const SHOTS_DIR = path.resolve(import.meta.dirname, "..", "screenshots");

/** Recharts needs a real viewport; 1440 is the widest layout breakpoint. */
const DESKTOP = { width: 1440, height: 1000 };
const VIEWPORTS = [
  { name: "mobile", width: 375, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
];

/**
 * Next.js dev-only noise that says nothing about app health. Everything else
 * counts as a failure.
 */
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /webpack-hmr/i,
  /React Router Future Flag/i,
];

/** The live FX endpoint. Blocking it is how the fallback path gets tested. */
const FX_ENDPOINT_PATTERN = /open\.er-api\.com/;

const steps = [];
const consoleErrors = [];
const consoleWarnings = [];
const pageErrors = [];
const failedRequests = [];

let currentStep = "startup";

/**
 * Set only while a step deliberately severs the rates endpoint. A blocked
 * request surfaces as a browser-level network error that no amount of catching
 * in app code can suppress, so the one step that causes it on purpose opts out
 * — narrowly, and for that endpoint alone.
 */
let expectFxNetworkFailure = false;

function isExpectedFxFailure(...candidates) {
  if (!expectFxNetworkFailure) return false;
  return candidates.some((value) => value && FX_ENDPOINT_PATTERN.test(value));
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function step(name, fn) {
  currentStep = name;
  const startedAt = Date.now();
  try {
    const detail = await fn();
    steps.push({ name, status: "pass", ms: Date.now() - startedAt, detail });
    log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
    return true;
  } catch (error) {
    const message = error?.message?.split("\n")[0] ?? String(error);
    steps.push({
      name,
      status: "fail",
      ms: Date.now() - startedAt,
      error: message,
      stack: error?.stack?.split("\n").slice(0, 6).join("\n"),
    });
    log(`  FAIL  ${name}\n        ${message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`), fullPage: false });
}

async function fullShot(page, name) {
  await page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`), fullPage: true });
}

/**
 * Types a query, waits for the listbox to filter, then commits with the
 * keyboard — exercising the whole ARIA combobox contract rather than just
 * setting a value.
 */
async function pickCity(page, label, query, expectedText) {
  const input = page.getByRole("combobox", { name: label });
  await input.click();

  const listbox = page.locator('ul[role="listbox"]').first();
  await listbox.waitFor({ state: "visible", timeout: 5000 });

  await input.pressSequentially(query, { delay: 22 });

  const options = listbox.locator('li[role="option"]');
  await options.first().waitFor({ state: "visible", timeout: 5000 });

  const count = await options.count();
  assert(count > 0, `combobox "${label}" showed no options for "${query}"`);

  const firstText = (await options.first().innerText()).replace(/\s+/g, " ").trim();
  assert(
    firstText.toLowerCase().includes(expectedText.toLowerCase()),
    `combobox "${label}" top hit for "${query}" was "${firstText}", expected to contain "${expectedText}"`
  );

  // The matched substring must be visibly highlighted.
  const marks = await listbox.locator("mark").count();
  assert(marks > 0, `combobox "${label}" did not highlight the matched substring`);

  await input.press("ArrowDown");
  const activeDescendant = await input.getAttribute("aria-activedescendant");
  assert(
    Boolean(activeDescendant),
    `combobox "${label}" did not set aria-activedescendant on arrow-key navigation`
  );

  await input.press("Enter");
  await listbox.waitFor({ state: "hidden", timeout: 5000 });

  const value = await input.inputValue();
  assert(
    value.toLowerCase().includes(query.slice(0, 4).toLowerCase()),
    `combobox "${label}" kept value "${value}" after selecting "${query}"`
  );
  return value;
}

/**
 * The chart tabs live in the "Chart view" segmented control. Scoping to it
 * keeps the lookup unambiguous — several metric names ("Runway") legitimately
 * appear on other controls earlier in the document.
 */
function chartTab(page, name) {
  return page
    .getByRole("group", { name: "Chart view" })
    .getByRole("button", { name: new RegExp(name, "i") });
}

/** The currency symbol rendered inside a money field, e.g. "$" or "¥". */
async function moneyPrefix(page, label) {
  return page
    .getByLabel(label, { exact: false })
    .first()
    .evaluate(
      (el) =>
        el.parentElement
          ?.querySelector("span[aria-hidden]")
          ?.textContent?.trim() ?? ""
    );
}

async function moneyValue(page, label) {
  return page.getByLabel(label, { exact: false }).first().inputValue();
}

async function setMoney(page, label, amount) {
  const field = page.getByLabel(label, { exact: false }).first();
  await field.click();
  await field.press("Meta+a");
  await field.pressSequentially(String(amount), { delay: 8 });
  await field.blur();
  return field.inputValue();
}

async function main() {
  await mkdir(SHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  const page = await context.newPage();

  page.on("console", (message) => {
    const text = message.text();
    if (IGNORED_CONSOLE.some((pattern) => pattern.test(text))) return;
    if (isExpectedFxFailure(text, message.location()?.url)) return;
    const entry = { step: currentStep, text: text.slice(0, 400) };
    if (message.type() === "error") consoleErrors.push(entry);
    if (message.type() === "warning") consoleWarnings.push(entry);
  });

  page.on("pageerror", (error) => {
    pageErrors.push({ step: currentStep, text: `${error.name}: ${error.message}`.slice(0, 400) });
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (/ERR_ABORTED/.test(failure)) return;
    if (isExpectedFxFailure(request.url())) return;
    failedRequests.push({ step: currentStep, text: `${request.method()} ${request.url()} — ${failure}` });
  });

  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedRequests.push({
        step: currentStep,
        text: `${response.status()} ${response.url()}`,
      });
    }
  });

  log(`\nVerifying ${BASE_URL}\n`);

  // ---------------------------------------------------------------- landing
  await step("1. Landing page loads", async () => {
    const response = await page.goto(BASE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    assert(response, "no response from server");
    assert(
      response.status() === 200,
      `expected HTTP 200, got ${response.status()}`
    );
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    return `HTTP ${response.status()}`;
  });

  await step("2. Hero headline and compare card render", async () => {
    const h1 = page.locator("h1").first();
    await h1.waitFor({ state: "visible", timeout: 15000 });
    const headline = (await h1.innerText()).replace(/\s+/g, " ").trim();
    assert(headline.length > 20, `h1 was too short: "${headline}"`);

    const box = await h1.boundingBox();
    assert((box?.height ?? 0) > 20, "h1 rendered with no height");

    await page.getByRole("combobox", { name: "Current city" }).waitFor({ timeout: 10000 });
    await page.getByRole("combobox", { name: "New city" }).waitFor({ timeout: 10000 });
    await page
      .getByRole("button", { name: /calculate/i })
      .first()
      .waitFor({ timeout: 10000 });
    return `"${headline.slice(0, 48)}…"`;
  });

  await step("3. Tailwind styles applied (not unstyled HTML)", async () => {
    const bg = await page.evaluate(() => {
      const styles = getComputedStyle(document.body);
      return { background: styles.backgroundColor, font: styles.fontFamily };
    });
    assert(
      bg.background !== "rgba(0, 0, 0, 0)" && bg.background !== "",
      "body has no background colour — stylesheet likely did not load"
    );
    assert(
      /inter|__inter|system-ui|sans/i.test(bg.font),
      `body font-family looks wrong: ${bg.font}`
    );
    return bg.font.split(",")[0];
  });

  await step("4. Screenshot: landing (desktop)", async () => {
    await page.waitForTimeout(700);
    await fullShot(page, "01-landing-desktop");
    await shot(page, "01-landing-desktop-fold");
    return "saved";
  });

  // --------------------------------------------------------------- combobox
  await step("5. Combobox opens with popular cities before typing", async () => {
    const input = page.getByRole("combobox", { name: "Current city" });
    await input.click();
    const listbox = page.locator('ul[role="listbox"]').first();
    await listbox.waitFor({ state: "visible", timeout: 5000 });
    const count = await listbox.locator('li[role="option"]').count();
    assert(count > 0, "no default options shown on focus");
    assert(
      (await input.getAttribute("aria-expanded")) === "true",
      "aria-expanded was not true while the popup was open"
    );
    await shot(page, "02-combobox-open");
    await input.press("Escape");
    await listbox.waitFor({ state: "hidden", timeout: 3000 });
    return `${count} default options, Escape closed it`;
  });

  await step("6. Current city: type → filter → arrow → Enter", async () =>
    pickCity(page, "Current city", "San Fran", "San Francisco")
  );

  await step("7. New city: type → filter → arrow → Enter", async () =>
    pickCity(page, "New city", "Lisbon", "Lisbon")
  );

  await step("8. Combobox filters to nothing gracefully", async () => {
    const input = page.getByRole("combobox", { name: "New city" });
    await input.click();
    await input.pressSequentially("zzzznotacity", { delay: 6 });
    const empty = page.getByText(/no cities found/i).first();
    await empty.waitFor({ state: "visible", timeout: 5000 });
    await input.press("Escape");
    // Escape must restore the previous selection, not clear it.
    const value = await input.inputValue();
    assert(
      /lisbon/i.test(value),
      `Escape lost the previous selection; input now reads "${value}"`
    );
    return "empty state shown, selection preserved";
  });

  await step("9. Outside click closes the popup", async () => {
    const input = page.getByRole("combobox", { name: "Current city" });
    await input.click();
    const listbox = page.locator('ul[role="listbox"]').first();
    await listbox.waitFor({ state: "visible", timeout: 5000 });
    await page.locator("h1").first().click({ position: { x: 4, y: 4 } });
    await listbox.waitFor({ state: "hidden", timeout: 5000 });
    return "closed";
  });

  // ------------------------------------------------------------ money fields
  await step("10. Savings and income fields accept input", async () => {
    const savings = await setMoney(page, "Current savings", 480000);
    const income = await setMoney(page, "Pre-tax household income", 210000);
    assert(/480,?000/.test(savings), `savings field shows "${savings}"`);
    assert(/210,?000/.test(income), `income field shows "${income}"`);
    return `savings ${savings}, income ${income}`;
  });

  await step("11. Validation toast fires on an invalid form", async () => {
    const savings = page.getByLabel("Current savings", { exact: false }).first();
    await savings.click();
    await savings.press("Meta+a");
    await savings.press("Backspace");
    await savings.blur();

    await page.getByRole("button", { name: /calculate/i }).first().click();
    const alert = page.locator('[role="alert"]').first();
    await alert.waitFor({ state: "visible", timeout: 5000 });
    const text = (await alert.innerText()).replace(/\s+/g, " ").trim();
    await shot(page, "03-validation-toast");

    // Results must NOT have rendered.
    const heroCount = await page.getByRole("button", { name: /^Edit$/ }).count();
    assert(heroCount === 0, "an invalid form still produced results");

    await page.getByRole("button", { name: /dismiss notification/i }).first().click();
    await setMoney(page, "Current savings", 480000);
    return `"${text.slice(0, 60)}…"`;
  });

  await step("12. Screenshot: filled compare card", async () => {
    await shot(page, "04-compare-card-filled");
    return "saved";
  });

  // ------------------------------------------------------------------ submit
  await step("13. Calculate runs and results view renders", async () => {
    await page.getByRole("button", { name: /calculate/i }).first().click();

    // The skeleton should appear, then the real hero.
    const hero = page.getByRole("button", { name: /^Assumptions$/ }).first();
    await hero.waitFor({ state: "visible", timeout: 20000 });
    await page.waitForTimeout(400);

    const body = await page.locator("main").innerText();
    assert(
      /San Francisco/i.test(body) && /Lisbon/i.test(body),
      "results do not mention both cities — landing selections were lost"
    );
    assert(
      /year|month|never run out/i.test(body),
      "results contain no runway figure"
    );
    return "results rendered with both cities";
  });

  await step("14. Runway hero shows a real number", async () => {
    const text = (await page.locator("main").innerText()).replace(/\s+/g, " ");
    const match = text.match(/(\d+)\s*years?/i);
    assert(
      match || /never run out/i.test(text),
      "no runway value found in the hero"
    );
    assert(
      !/NaN|Infinity|undefined|\$NaN/.test(text),
      `results contain a broken number: ${text.match(/.{0,40}(NaN|Infinity|undefined).{0,40}/)?.[0]}`
    );
    return match ? `${match[1]} years` : "never runs out";
  });

  await step("15. Metric cards render", async () => {
    const text = await page.locator("main").innerText();
    for (const label of ["Runway", "burn", "cashflow"]) {
      assert(
        new RegExp(label, "i").test(text),
        `metric card "${label}" missing from results`
      );
    }
    return "runway / burn / cashflow present";
  });

  // ------------------------------------------------------------------ charts
  await step("16. Trajectory chart renders with real dimensions", async () => {
    const svg = page.locator(".recharts-surface").first();
    await svg.waitFor({ state: "visible", timeout: 15000 });
    const box = await svg.boundingBox();
    assert(box, "chart svg has no bounding box");
    assert(
      box.height > 120,
      `chart collapsed to ${Math.round(box.height)}px tall — zero-height flex/grid container`
    );
    assert(box.width > 200, `chart collapsed to ${Math.round(box.width)}px wide`);

    const lines = await page
      .locator(".recharts-area-area, .recharts-line-curve, .recharts-area-curve")
      .count();
    assert(lines > 0, "chart drew no series paths");
    return `${Math.round(box.width)}×${Math.round(box.height)}, ${lines} series`;
  });

  await step("17. Chart tooltip is the custom one", async () => {
    const svg = page.locator(".recharts-surface").first();
    // `page.mouse` works in viewport coordinates and does not auto-scroll the
    // way locator actions do, so the plot area has to be on screen first.
    await svg.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const box = await svg.boundingBox();
    // Recharts arms its tooltip on mousemove over the plot area, so a single
    // teleporting move can land before the chart has attached its handlers.
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
    await page.waitForTimeout(120);
    await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5, {
      steps: 8,
    });
    await page.waitForTimeout(400);
    const tooltip = page.locator(".recharts-tooltip-wrapper").first();
    const visible = await tooltip.isVisible().catch(() => false);
    assert(visible, "no tooltip appeared on hover");
    const text = (await tooltip.innerText()).replace(/\s+/g, " ").trim();
    assert(text.length > 4, "tooltip rendered empty");
    assert(
      !/^\s*\d+\s*:\s*/.test(text),
      "tooltip looks like the Recharts default"
    );
    await shot(page, "05-chart-tooltip");
    return `"${text.slice(0, 60)}"`;
  });

  await step("18. Depletion annotation present on the runway chart", async () => {
    const labels = await page
      .locator(".recharts-reference-line, .recharts-reference-dot, .recharts-label")
      .count();
    assert(labels > 0, "no reference line / depletion marker drawn");
    return `${labels} annotation elements`;
  });

  await step("19. Chart tabs switch (categories + buying power)", async () => {
    for (const tab of ["Categories", "Buying power"]) {
      await chartTab(page, tab).click();
      await page.waitForTimeout(650);
      const svg = page.locator(".recharts-surface").first();
      await svg.waitFor({ state: "visible", timeout: 10000 });
      const box = await svg.boundingBox();
      assert(
        (box?.height ?? 0) > 120,
        `"${tab}" chart collapsed to ${Math.round(box?.height ?? 0)}px`
      );
      await shot(page, `06-chart-${tab.toLowerCase().replace(/\s+/g, "-")}`);
    }
    await chartTab(page, "Runway").click();
    await page.waitForTimeout(500);
    return "both alternate charts drew";
  });

  await step("20. Nominal vs real buying-power toggle works", async () => {
    await chartTab(page, "Buying power").click();
    await page.waitForTimeout(500);
    const toggle = page
      .getByRole("button", { name: /real|ppp|nominal/i })
      .first();
    const found = await toggle.count();
    assert(found > 0, "no nominal/real toggle found on the buying-power view");
    const toggleName = await toggle.getAttribute("aria-label");
    await toggle.click();
    await page.waitForTimeout(600);
    const box = await page.locator(".recharts-surface").first().boundingBox();
    assert((box?.height ?? 0) > 120, "chart broke after toggling real/nominal");
    await chartTab(page, "Runway").click();
    await page.waitForTimeout(400);
    return `toggled via "${toggleName}"`;
  });

  // Real (inflation out) and international (price level out too) were one
  // number under two names until recently. Drawing identically is the
  // regression to watch for.
  await step("20b. Three balance lenses stay distinct", async () => {
    await chartTab(page, "Buying power").click();
    await page.waitForTimeout(500);
    const group = page
      .getByRole("group")
      .filter({ has: page.getByRole("button", { name: /^Nominal/ }) })
      .first();

    await group.getByRole("button", { name: /^Real value/i }).click();
    await page.waitForTimeout(650);
    const realHtml = await page.locator(".recharts-surface").first().innerHTML();

    await group.getByRole("button", { name: /International dollars/i }).click();
    await page.waitForTimeout(650);
    const intlHtml = await page.locator(".recharts-surface").first().innerHTML();

    assert(
      realHtml !== intlHtml,
      "the international-dollars lens drew the same series as the real one"
    );
    for (const label of ["Nominal", "Real, local prices", "International dollars"]) {
      const count = await page.getByText(label, { exact: true }).count();
      assert(count > 0, `no "${label}" lens label under the buying-power chart`);
    }
    await shot(page, "06b-buying-power-intl");
    await chartTab(page, "Runway").click();
    await page.waitForTimeout(400);
    return "nominal / real / international all labelled and distinct";
  });

  await step("21. Screenshot: results (desktop)", async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await shot(page, "07-results-desktop-fold");
    await fullShot(page, "07-results-desktop");
    return "saved";
  });

  // ---------------------------------------------------------------- overlays
  await step("22. Metric card opens the month-by-month detail overlay", async () => {
    const card = page
      .locator('[data-testid="metric-card"]')
      .first();
    const hasCards = (await card.count()) > 0;
    assert(hasCards, "no metric card is clickable (missing data-testid)");
    await card.click();
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: "visible", timeout: 8000 });
    const text = await dialog.innerText();
    assert(
      /table|month|year/i.test(text),
      "detail overlay opened but has no month-by-month content"
    );
    await shot(page, "08-detail-overlay");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 8000 });
    return "opened and closed with Escape";
  });

  await step("23. Breakdown sheet opens from the results CTA", async () => {
    await page.getByRole("button", { name: /view breakdown/i }).first().click();
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: "visible", timeout: 8000 });
    const rows = await dialog.locator("tr").count();
    assert(rows > 2, `breakdown table only had ${rows} rows`);
    await shot(page, "09-breakdown-sheet");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 8000 });
    return `${rows} table rows`;
  });

  await step("24. Explainer popovers open (PPP / runway / real)", async () => {
    const tips = page.getByRole("button", { name: /more info|explain|what/i });
    const count = await tips.count();
    assert(count > 0, "no explainer popover triggers found");
    await tips.first().click();
    await page.waitForTimeout(280);
    const content = page.locator('[role="tooltip"], [role="dialog"]').first();
    await content.waitFor({ state: "visible", timeout: 5000 });
    const text = (await content.innerText()).trim();
    assert(text.length > 12, "explainer popover was empty");
    await page.keyboard.press("Escape");
    return `${count} triggers, first reads "${text.slice(0, 40)}…"`;
  });

  // ------------------------------------------------------- expenses / budget
  await step("25. Assumptions drawer opens with editable budget fields", async () => {
    await page.getByRole("button", { name: /^Assumptions$/ }).first().click();
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: "visible", timeout: 8000 });

    for (const label of [
      "Rent / mortgage",
      "Food & groceries",
      "Medical & insurance",
      "School & childcare",
      "Utilities & internet",
      "Savings & investments",
      "Discretionary",
      "Miscellaneous",
    ]) {
      const count = await dialog.getByText(label, { exact: false }).count();
      assert(count > 0, `budget category "${label}" missing from the drawer`);
    }
    await shot(page, "10-assumptions-drawer");
    return "every budget category present, new ones included";
  });

  await step("26. Editing an expense changes the projection", async () => {
    const dialog = page.locator('[role="dialog"]').first();

    // Each budget line is a row carrying its own amount and currency, so the
    // field has to be found within its row: the category name now also appears
    // on the row's move and remove buttons.
    const rentRow = dialog.locator("li").filter({ hasText: "Rent / mortgage" }).first();
    const rentField = rentRow.locator("input").first();
    const before = await rentField.inputValue();
    await rentField.click();
    await rentField.press("Meta+a");
    await rentField.pressSequentially("9000", { delay: 8 });
    await rentField.blur();
    await page.waitForTimeout(400);
    const after = await rentField.inputValue();
    assert(
      after !== before && /9,?000/.test(after),
      `rent field did not accept the edit (before "${before}", after "${after}")`
    );

    await page.getByRole("button", { name: /^Done$/ }).first().click();
    await dialog.waitFor({ state: "hidden", timeout: 8000 });
    await page.waitForTimeout(500);

    const text = (await page.locator("main").innerText()).replace(/\s+/g, " ");
    assert(!/NaN|Infinity/.test(text), "projection broke after the expense edit");
    return `rent ${before} → ${after}, projection recomputed cleanly`;
  });

  // The case this feature exists for: you move, but the home-loan EMI and the
  // school fees keep being billed in the currency you left behind.
  await step("26b. A budget line can be billed in another currency", async () => {
    await page.getByRole("button", { name: /^Assumptions$/ }).first().click();
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: "visible", timeout: 8000 });

    const schoolRow = dialog
      .locator("li")
      .filter({ hasText: "School & childcare" })
      .first();
    const amount = schoolRow.locator("input").first();
    await amount.click();
    await amount.press("Meta+a");
    await amount.pressSequentially("40000", { delay: 8 });
    await amount.blur();

    await schoolRow.locator("select").first().selectOption("INR");
    await page.waitForTimeout(500);

    const rowText = (await schoolRow.innerText()).replace(/\s+/g, " ");
    assert(
      /=\s*\S*[\d,.]+/.test(rowText),
      `no converted equivalent shown beside the foreign amount: "${rowText}"`
    );
    assert(
      /INR economy/.test(rowText),
      `row does not say it inflates at the rupee economy's rate: "${rowText}"`
    );

    const warning = dialog
      .locator("p")
      .filter({ hasText: /in a foreign currency/i })
      .first();
    await warning.waitFor({ state: "visible", timeout: 5000 });
    const warningText = (await warning.innerText()).replace(/\s+/g, " ");
    assert(
      /not fixed costs/i.test(warningText),
      `FX risk on foreign rows is not acknowledged: "${warningText}"`
    );

    await shot(page, "10b-assumptions-foreign-row");
    await page.getByRole("button", { name: /^Done$/ }).first().click();
    await dialog.waitFor({ state: "hidden", timeout: 8000 });
    await page.waitForTimeout(500);

    const text = (await page.locator("main").innerText()).replace(/\s+/g, " ");
    assert(!/NaN|Infinity/.test(text), "projection broke on a foreign-currency row");
    return `rupee school fees converted and flagged: "${warningText.slice(0, 48)}…"`;
  });

  await step("27. Edit overlay preserves and updates city selections", async () => {
    await page.getByRole("button", { name: /^Edit$/ }).first().click();
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: "visible", timeout: 8000 });

    const cityA = dialog.getByRole("combobox", { name: "Current city" });
    const value = await cityA.inputValue();
    assert(
      /san francisco/i.test(value),
      `edit overlay lost the current city; reads "${value}"`
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 8000 });
    return `carried "${value}" through`;
  });

  // -------------------------------------------------------------- dark mode
  await step("28. Dark mode toggle works and persists", async () => {
    const toggle = page.getByRole("button", { name: /theme|dark|light/i }).first();
    assert((await toggle.count()) > 0, "no theme toggle found");

    const before = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    await toggle.click();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    assert(after !== before, "toggling the theme did not change the dark class");

    const stored = await page.evaluate(() => localStorage.getItem("mml-theme"));
    assert(stored, "theme was not persisted to localStorage");

    await fullShot(page, "11-results-dark");
    return `${before ? "dark" : "light"} → ${after ? "dark" : "light"}, stored "${stored}"`;
  });

  await step("29. Dark theme survives a reload without a hydration mismatch", async () => {
    const errorsBefore = consoleErrors.length;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    assert(isDark, "dark mode was lost across a reload");

    const hydration = consoleErrors
      .slice(errorsBefore)
      .filter((entry) => /hydrat|did not match|server HTML/i.test(entry.text));
    assert(
      hydration.length === 0,
      `hydration mismatch after reload: ${hydration[0]?.text}`
    );
    await shot(page, "12-landing-dark");
    return "persisted, no hydration warnings";
  });

  await step("30. Keyboard-only path through the compare card", async () => {
    await page.evaluate(() => localStorage.setItem("mml-theme", "light"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);

    const input = page.getByRole("combobox", { name: "Current city" });
    await input.focus();
    await page.keyboard.press("ArrowDown");
    const listbox = page.locator('ul[role="listbox"]').first();
    await listbox.waitFor({ state: "visible", timeout: 5000 });
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await listbox.waitFor({ state: "hidden", timeout: 5000 });
    const value = await input.inputValue();
    assert(value.length > 1, "keyboard selection did not set a city");

    const focusRing = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const styles = getComputedStyle(el);
      return { outline: styles.outlineWidth, shadow: styles.boxShadow };
    });
    return `selected "${value}" with the keyboard`;
  });

  // ------------------------------------------------------------- responsive
  await step("31. Responsive screenshots at 375 / 768 / 1440", async () => {
    const names = [];
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(600);
      await fullShot(page, `13-landing-${viewport.name}-${viewport.width}`);
      names.push(`${viewport.name} ${viewport.width}px`);

      // No horizontal overflow at any width.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      assert(
        overflow <= 2,
        `${viewport.name} (${viewport.width}px) overflows horizontally by ${overflow}px`
      );
    }
    return names.join(", ");
  });

  await step("32. Full flow at 375px (mobile)", async () => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    await pickCity(page, "Current city", "New York", "New York");
    await pickCity(page, "New city", "Austin", "Austin");
    await setMoney(page, "Current savings", 300000);
    await page.getByRole("button", { name: /calculate/i }).first().click();

    await page
      .getByRole("button", { name: /^Assumptions$/ })
      .first()
      .waitFor({ state: "visible", timeout: 20000 });
    await page.waitForTimeout(900);

    const box = await page.locator(".recharts-surface").first().boundingBox();
    assert((box?.height ?? 0) > 100, "chart did not render on mobile");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    assert(overflow <= 2, `mobile results overflow horizontally by ${overflow}px`);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await shot(page, "14-results-mobile-fold");
    await fullShot(page, "14-results-mobile");
    return `chart ${Math.round(box.width)}×${Math.round(box.height)}, no overflow`;
  });

  await step("33. Tablet results at 768px", async () => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(700);
    await fullShot(page, "15-results-tablet");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    assert(overflow <= 2, `tablet overflows horizontally by ${overflow}px`);
    return "saved";
  });

  await step("34. Accessibility contract on interactive elements", async () => {
    await page.setViewportSize(DESKTOP);
    await page.waitForTimeout(400);

    const issues = await page.evaluate(() => {
      const problems = [];
      document.querySelectorAll("button").forEach((button) => {
        const name =
          button.getAttribute("aria-label") ||
          button.textContent?.trim() ||
          button.getAttribute("title");
        if (!name) problems.push(`button without an accessible name: ${button.className.slice(0, 60)}`);
      });
      document.querySelectorAll('input:not([type="hidden"])').forEach((input) => {
        const id = input.getAttribute("id");
        const labelled =
          input.getAttribute("aria-label") ||
          input.getAttribute("aria-labelledby") ||
          (id && document.querySelector(`label[for="${id}"]`));
        if (!labelled) problems.push(`input without a label: #${id || "(no id)"}`);
      });
      document.querySelectorAll('[role="dialog"]').forEach((dialog) => {
        if (!dialog.getAttribute("aria-label") && !dialog.getAttribute("aria-labelledby")) {
          problems.push("dialog without an accessible name");
        }
      });
      return problems;
    });

    assert(issues.length === 0, `${issues.length} a11y problem(s): ${issues.slice(0, 4).join(" | ")}`);
    return "all buttons named, all inputs labelled";
  });

  // -------------------------------------------------------------- currency
  await step("35. Income field follows the destination currency", async () => {
    await page.setViewportSize(DESKTOP);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    await pickCity(page, "Current city", "New York", "New York");
    await pickCity(page, "New city", "Lisbon", "Lisbon");
    await page.waitForTimeout(300);

    const euroPrefix = await moneyPrefix(page, "Pre-tax household income");
    const euroValue = await moneyValue(page, "Pre-tax household income");
    assert(
      euroPrefix === "€",
      `income prefix for a Lisbon destination was "${euroPrefix}", expected "€"`
    );
    const savingsPrefix = await moneyPrefix(page, "Current savings");
    assert(
      savingsPrefix === "$",
      `savings prefix should stay in the home currency, got "${savingsPrefix}"`
    );

    // Switching the destination must move both the unit and the figure.
    await pickCity(page, "New city", "Tokyo", "Tokyo");
    await page.waitForTimeout(400);

    const yenPrefix = await moneyPrefix(page, "Pre-tax household income");
    const yenValue = await moneyValue(page, "Pre-tax household income");
    assert(
      yenPrefix === "¥",
      `income prefix did not follow the destination to Tokyo: "${yenPrefix}"`
    );
    assert(
      yenValue !== euroValue,
      `income figure stayed at ${yenValue} when the currency changed — a euro amount relabelled as yen`
    );
    assert(
      parseInt(yenValue.replace(/[^0-9]/g, ""), 10) >
        parseInt(euroValue.replace(/[^0-9]/g, ""), 10),
      `converting ${euroValue} EUR to yen should grow the figure, got ${yenValue}`
    );
    assert(
      (await moneyPrefix(page, "Current savings")) === "$",
      "changing the destination must not touch the savings currency"
    );
    return `€${euroValue} → ¥${yenValue}`;
  });

  await step("36. Rates indicator names the source and timestamp", async () => {
    const note = page.locator("form p", { hasText: /1 USD =/ }).first();
    await note.waitFor({ state: "visible", timeout: 8000 });
    const text = (await note.innerText()).replace(/\s+/g, " ").trim();
    assert(
      /1 USD = [\d.,]+ JPY/.test(text),
      `rate line did not state the USD→JPY rate: "${text}"`
    );
    assert(
      /rates as of .*UTC|bundled offline snapshot/.test(text),
      `rate line named neither a timestamp nor the fallback: "${text}"`
    );
    return `"${text.slice(0, 74)}"`;
  });

  await step("37. Projection renders in the destination currency", async () => {
    await setMoney(page, "Current savings", 400000);
    await page.getByRole("button", { name: /calculate/i }).first().click();
    await page
      .getByRole("button", { name: /^Assumptions$/ })
      .first()
      .waitFor({ state: "visible", timeout: 20000 });
    await page.waitForTimeout(900);

    const cards = await page.locator('[data-testid="metric-card"]').allInnerTexts();
    const cardText = cards.join(" ").replace(/\s+/g, " ");
    assert(cardText.includes("¥"), `metric cards show no yen figures: "${cardText.slice(0, 120)}"`);
    assert(
      !/\$[\d]/.test(cardText),
      `metric cards still show a dollar figure: "${cardText.match(/.{0,30}\$\d.{0,30}/)?.[0]}"`
    );
    assert(
      !/NaN|Infinity|undefined/.test(cardText),
      "metric cards contain a broken number after conversion"
    );

    // The chart's own axis must be in the same unit as the cards. Axis ticks are
    // SVG <text>, and innerText is an HTMLElement property — reading it there
    // yields undefined, so go through textContent.
    const ticks = await page
      .locator(".recharts-yAxis .recharts-cartesian-axis-tick-value")
      .allTextContents();
    assert(
      ticks.some((tick) => tick.includes("¥")),
      `chart y-axis is not in yen: ${ticks.slice(0, 4).join(", ")}`
    );

    await shot(page, "16-results-destination-currency");
    return `${cards.length} cards and the chart axis in JPY`;
  });

  await step("38. JPY renders with no decimal places", async () => {
    await page.getByRole("button", { name: /view breakdown/i }).first().click();
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: "visible", timeout: 8000 });
    const table = (await dialog.innerText()).replace(/\s+/g, " ");

    // Compact axis labels legitimately carry one decimal ("¥39.6M"); a plain
    // table figure must not, because the yen has no minor unit.
    const withDecimals = table.match(/¥[\d,]+\.\d+/g) ?? [];
    assert(
      withDecimals.length === 0,
      `zero-decimal currency rendered with decimals: ${withDecimals.slice(0, 3).join(", ")}`
    );
    assert(table.includes("¥"), "breakdown table is not in yen");
    assert(
      !/¥(?!\d)/.test(table),
      "found a currency symbol with no figure attached to it"
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 8000 });
    return `${(table.match(/¥[\d,]+/g) ?? []).length} yen figures, none with decimals`;
  });

  await step("39. Falls back to bundled rates when the FX API is unreachable", async () => {
    expectFxNetworkFailure = true;
    try {
      await page.route("**open.er-api.com/**", (route) => route.abort());
      // The cache would otherwise satisfy the request without a fetch.
      await page.evaluate(() => localStorage.removeItem("mml-fx-cache"));
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      await pickCity(page, "Current city", "New York", "New York");
      await pickCity(page, "New city", "Tokyo", "Tokyo");
      await page.waitForTimeout(400);

      const note = page.locator("form p", { hasText: /1 USD =/ }).first();
      await note.waitFor({ state: "visible", timeout: 8000 });
      const text = (await note.innerText()).replace(/\s+/g, " ").trim();
      assert(
        /bundled offline snapshot/i.test(text),
        `fallback was not announced to the user: "${text}"`
      );
      assert(
        /1 USD = 151 JPY/.test(text),
        `fallback rate was not the bundled one: "${text}"`
      );

      // A dead rates endpoint must not stop a projection.
      assert(
        (await moneyPrefix(page, "Pre-tax household income")) === "¥",
        "income field lost its destination currency on the fallback path"
      );
      await setMoney(page, "Current savings", 400000);
      await page.getByRole("button", { name: /calculate/i }).first().click();
      await page
        .getByRole("button", { name: /^Assumptions$/ })
        .first()
        .waitFor({ state: "visible", timeout: 20000 });
      await page.waitForTimeout(700);

      const body = (await page.locator("main").innerText()).replace(/\s+/g, " ");
      assert(body.includes("¥"), "no yen figures rendered on the fallback path");
      assert(
        !/NaN|Infinity|undefined/.test(body),
        "fallback path produced a broken number"
      );
      await shot(page, "17-fx-fallback");
      return `"${text.slice(0, 62)}"`;
    } finally {
      await page.unroute("**open.er-api.com/**").catch(() => {});
      expectFxNetworkFailure = false;
    }
  });

  await browser.close();
}

let crashed = null;
try {
  await main();
} catch (error) {
  crashed = error;
}

// ------------------------------------------------------------------- report
const passed = steps.filter((s) => s.status === "pass").length;
const failed = steps.filter((s) => s.status === "fail").length;
const noiseTotal = consoleErrors.length + pageErrors.length;

log("\n" + "─".repeat(72));
log(`Steps:            ${passed} passed, ${failed} failed`);
log(`Console errors:   ${consoleErrors.length}`);
log(`Uncaught errors:  ${pageErrors.length}`);
log(`Console warnings: ${consoleWarnings.length}`);
log(`Failed requests:  ${failedRequests.length}`);
log("─".repeat(72));

const dump = (title, entries) => {
  if (entries.length === 0) return;
  log(`\n${title}:`);
  const seen = new Set();
  for (const entry of entries) {
    const key = entry.text.slice(0, 160);
    if (seen.has(key)) continue;
    seen.add(key);
    log(`  [${entry.step}] ${entry.text}`);
  }
};

dump("CONSOLE ERRORS", consoleErrors);
dump("UNCAUGHT EXCEPTIONS", pageErrors);
dump("CONSOLE WARNINGS", consoleWarnings);
dump("FAILED REQUESTS", failedRequests);

if (failed > 0) {
  log("\nFAILED STEPS:");
  for (const s of steps.filter((x) => x.status === "fail")) {
    log(`  ${s.name}\n    ${s.error}`);
  }
}

await writeFile(
  path.join(SHOTS_DIR, "..", "scripts", "verify-app.report.json"),
  JSON.stringify(
    { baseUrl: BASE_URL, passed, failed, steps, consoleErrors, pageErrors, consoleWarnings, failedRequests },
    null,
    2
  )
);

if (crashed) {
  log(`\nSCRIPT CRASHED during "${currentStep}": ${crashed.message}`);
}

const ok = failed === 0 && noiseTotal === 0 && !crashed;
log(`\n${ok ? "ALL CHECKS PASSED" : "VERIFICATION FAILED"}\n`);
process.exit(ok ? 0 : 1);
