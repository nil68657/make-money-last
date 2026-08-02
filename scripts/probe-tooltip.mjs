import { existsSync } from "node:fs";
import path from "node:path";

const LOCAL = path.resolve(import.meta.dirname, "..", ".playwright-browsers");
if (existsSync(LOCAL)) process.env.PLAYWRIGHT_BROWSERS_PATH = LOCAL;
const { chromium } = await import("playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("console", (m) => console.log(`[console:${m.type()}]`, m.text().slice(0, 200)));
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 200)));

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /calculate/i }).first().click();
await page.getByRole("button", { name: /^Assumptions$/ }).first().waitFor({ timeout: 20000 });
await page.waitForTimeout(1500);

const svg = page.locator(".recharts-surface").first();
await svg.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const box = await svg.boundingBox();
console.log("svg box", box);

// What is actually on top at the point we are about to hover?
const target = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 };
const topmost = await page.evaluate(({ x, y }) => {
  const el = document.elementFromPoint(x, y);
  const chain = [];
  let node = el;
  while (node && chain.length < 6) {
    chain.push(`${node.tagName.toLowerCase()}.${(node.className || "").toString().slice(0, 60)}`);
    node = node.parentElement;
  }
  return chain;
}, target);
console.log("elementFromPoint chain:", topmost);

await page.mouse.move(target.x - 120, target.y);
await page.waitForTimeout(150);
await page.mouse.move(target.x, target.y, { steps: 12 });
await page.waitForTimeout(600);

const info = await page.evaluate(() => {
  const wrapper = document.querySelector(".recharts-tooltip-wrapper");
  if (!wrapper) return { exists: false };
  const styles = getComputedStyle(wrapper);
  const rect = wrapper.getBoundingClientRect();
  return {
    exists: true,
    visibility: styles.visibility,
    opacity: styles.opacity,
    display: styles.display,
    pointerEvents: styles.pointerEvents,
    rect: { w: rect.width, h: rect.height, x: rect.x, y: rect.y },
    text: wrapper.textContent?.slice(0, 120),
    classes: wrapper.className,
    inlineStyle: wrapper.getAttribute("style"),
  };
});
console.log("tooltip wrapper:", JSON.stringify(info, null, 2));

const pwVisible = await page.locator(".recharts-tooltip-wrapper").first().isVisible();
console.log("playwright isVisible:", pwVisible);

const activeDots = await page.locator(".recharts-active-dot").count();
console.log("active dots:", activeDots);

await browser.close();
