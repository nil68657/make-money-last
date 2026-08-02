/** Scratch probe for destination-currency behaviour. Not part of the suite. */
import { existsSync } from "node:fs";
import path from "node:path";

const LOCAL = path.resolve(import.meta.dirname, "..", ".playwright-browsers");
if (existsSync(LOCAL)) process.env.PLAYWRIGHT_BROWSERS_PATH = LOCAL;
const { chromium } = await import("playwright");

const browser = await chromium.launch();

async function symbolFor(page, label) {
  const input = page.getByLabel(label, { exact: false }).first();
  return input.evaluate(
    (el) => el.parentElement?.querySelector("span[aria-hidden]")?.textContent?.trim() ?? null
  );
}

async function pick(page, label, query) {
  const input = page.getByRole("combobox", { name: label });
  await input.click();
  await input.press("Meta+a");
  await input.pressSequentially(query, { delay: 15 });
  const listbox = page.locator('ul[role="listbox"]').first();
  await listbox.locator('li[role="option"]').first().waitFor({ timeout: 5000 });
  await input.press("ArrowDown");
  await input.press("Enter");
  await listbox.waitFor({ state: "hidden", timeout: 5000 });
}

async function run(label, { offline }) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => errors.push(`PAGEERROR ${e.message.slice(0, 160)}`));

  if (offline) {
    await page.route("**open.er-api.com/**", (route) => route.abort());
  }

  console.log(`\n===== ${label} =====`);
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  console.log("savings symbol (NY/USD):", await symbolFor(page, "Current savings"));
  console.log("income  symbol (Lisbon/EUR):", await symbolFor(page, "Pre-tax household income"));
  console.log("income  value:", await page.getByLabel("Pre-tax household income", { exact: false }).first().inputValue());

  await pick(page, "New city", "Tokyo");
  await page.waitForTimeout(500);
  console.log("after Tokyo -> income symbol:", await symbolFor(page, "Pre-tax household income"));
  console.log("after Tokyo -> income value: ", await page.getByLabel("Pre-tax household income", { exact: false }).first().inputValue());

  const fxText = await page.locator("form p", { hasText: /1 USD =/ }).first().innerText().catch(() => "(none)");
  console.log("fx note:", fxText.replace(/\s+/g, " ").trim());

  await page.getByRole("button", { name: /calculate/i }).first().click();
  await page.getByRole("button", { name: /^Assumptions$/ }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1000);

  const main = (await page.locator("main").innerText()).replace(/\s+/g, " ");
  const yen = (main.match(/¥[\d,]+/g) ?? []).slice(0, 5);
  console.log("yen figures in results:", yen.join("  "));
  console.log("has decimals in yen?  ", /¥[\d,]+\.\d/.test(main));
  console.log("dollar leakage?       ", /\$[\d,]/.test(main));
  console.log("NaN/undefined?        ", /NaN|undefined|Infinity/.test(main));

  const methodology = await page.locator("main").getByText(/Every figure is shown in/).first().innerText().catch(() => "(none)");
  console.log("methodology:", methodology.replace(/\s+/g, " ").slice(0, 190));

  console.log("console errors:", errors.length, errors.slice(0, 3).join(" | "));
  await page.close();
}

await run("LIVE (network allowed)", { offline: false });
await run("OFFLINE (fx endpoint blocked)", { offline: true });

await browser.close();
