/**
 * Visual QA harness. Drives the locally installed Chrome over CDP and captures
 * the landing page, the city typeahead, and the results view in both themes at
 * desktop and mobile widths.
 *
 * Not part of the app build. Run against a dev server:
 *   npm run dev
 *   node scripts/shoot.mjs [baseUrl] [outDir]
 *
 * Requires puppeteer-core, which is intentionally not a saved dependency:
 *   npm install puppeteer-core --no-save
 */
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.resolve(process.argv[3] || "docs/screenshots");

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const VIEWPORTS = {
  desktop: { width: 1440, height: 950, deviceScaleFactor: 2 },
  mobile: { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true },
};

const shots = [];

async function shoot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  shots.push(file);
  console.log("  ✓", `${name}.png`);
}

/** Waits for the reveal/counter animations to settle before capturing. */
const settle = (ms = 900) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, viewport, theme) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORTS[viewport]);
  // Seed the theme before any app code runs so we never capture a flash.
  await page.evaluateOnNewDocument((t) => {
    localStorage.setItem("theme", t);
  }, theme);
  return page;
}

async function run() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "shell",
    args: ["--no-sandbox", "--force-color-profile=srgb", "--font-render-hinting=none"],
  });

  try {
    for (const viewport of ["desktop", "mobile"]) {
      for (const theme of ["light", "dark"]) {
        const tag = `${viewport}-${theme}`;
        console.log(`\n▸ ${tag}`);

        const page = await newPage(browser, viewport, theme);
        await page.goto(BASE, { waitUntil: "networkidle0" });
        await page.waitForSelector('[role="combobox"]');
        await settle();

        await shoot(page, `01-landing-${tag}`);

        // Typeahead: focus the destination field and type a partial,
        // diacritic-free query that should fuzzy-match.
        const boxes = await page.$$('[role="combobox"]');
        await boxes[1].click();
        await page.keyboard.type("zur", { delay: 60 });
        await page.waitForSelector('[role="option"]');
        await settle(400);
        await shoot(page, `02-typeahead-${tag}`);

        // Keyboard nav: move the active option, then commit with Enter.
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        await settle(250);
        await shoot(page, `03-typeahead-keyboard-${tag}`);
        await page.keyboard.press("Enter");
        await settle(300);

        // Run the projection.
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll("button")].find((b) =>
            b.textContent?.includes("Calculate my runway")
          );
          btn?.click();
        });
        await page.waitForFunction(
          () => document.body.innerText.includes("Your savings last") ||
                document.body.innerText.includes("never run out"),
          { timeout: 20000 }
        );
        await settle(1600); // counters + staggered reveals
        await page.evaluate(() => window.scrollTo(0, 0));
        await settle(400);
        await shoot(page, `04-results-hero-${tag}`);

        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9));
        await settle(700);
        await shoot(page, `05-results-metrics-${tag}`);

        // Each chart tab.
        const tabs = ["Categories", "Buying power"];
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9));
        await settle(800);
        await shoot(page, `06-chart-trajectory-${tag}`);

        for (const [i, label] of tabs.entries()) {
          const clicked = await page.evaluate((text) => {
            const btn = [...document.querySelectorAll("button")].find((b) =>
              b.textContent?.trim().includes(text)
            );
            if (!btn) return false;
            btn.click();
            return true;
          }, label);
          if (!clicked) {
            console.log(`  ! tab not found: ${label}`);
            continue;
          }
          await settle(1200);
          await shoot(page, `0${7 + i}-chart-${label.toLowerCase().replace(/\s+/g, "-")}-${tag}`);
        }

        // Assumptions drawer — the main "interlay".
        const opened = await page.evaluate(() => {
          const btn = [...document.querySelectorAll("button")].find(
            (b) =>
              b.getAttribute("aria-label") === "Assumptions" ||
              b.textContent?.trim() === "Assumptions"
          );
          if (!btn) return false;
          btn.click();
          return true;
        });
        if (opened) {
          await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
          await settle(900);
          await shoot(page, `09-assumptions-drawer-${tag}`);
          await page.keyboard.press("Escape");
          await settle(400);
        } else {
          console.log("  ! assumptions trigger not found");
        }

        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${shots.length} screenshots → ${OUT}`);
}

run().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
