/**
 * One command that answers the question that has repeatedly been answered
 * wrongly on this project: is the *server* down, or is the *app* broken?
 *
 * Those two look identical through Playwright — both surface as a wall of
 * element timeouts — but they need opposite responses. A dead server needs a
 * restart; broken app code needs a fix. Getting this backwards has burned
 * hours, so check it explicitly before drawing any conclusion from a failing
 * test run.
 *
 * Exit codes:  0 healthy · 2 server down · 3 server up but serving bad content
 *
 * Usage:  node scripts/health-check.mjs [--base http://localhost:3000]
 */

import process from "node:process";

const argv = process.argv.slice(2);
const baseIndex = argv.indexOf("--base");
const BASE = (baseIndex === -1 ? "http://localhost:3000" : argv[baseIndex + 1]).replace(/\/$/, "");

const problems = [];
const notes = [];

async function get(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();
    return { ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function report(verdict, exitCode) {
  const line = "─".repeat(64);
  console.log(line);
  console.log(verdict);
  if (notes.length) {
    console.log("");
    for (const note of notes) console.log(`  · ${note}`);
  }
  if (problems.length) {
    console.log("");
    for (const problem of problems) console.log(`  ✗ ${problem}`);
  }
  console.log(line);
  process.exit(exitCode);
}

// 1. Is anything listening at all?
let page;
try {
  page = await get(BASE);
} catch (error) {
  const reason = error?.name === "AbortError" ? "timed out" : error?.message ?? String(error);
  problems.push(`no HTTP response from ${BASE} (${reason})`);
  notes.push("The dev server is not answering. Start it with: npm run dev:bg");
  notes.push("This is a SERVER problem, not an application bug — do not go hunting in src/.");
  report("SERVER DOWN", 2);
}

if (!page.ok) {
  problems.push(`${BASE} returned HTTP ${page.status}`);
  report("SERVER UP, BAD RESPONSE", 3);
}
notes.push(`document: HTTP ${page.status}, ${page.body.length.toLocaleString()} bytes`);

// 2. Did Next actually render the app, or is this an error page?
if (!page.body.includes("self.__next_f")) {
  problems.push("no Next.js streaming payload in the HTML — the app did not render");
}
if (!/Make Money Last/i.test(page.body)) {
  problems.push('the product name is missing from the markup');
}

// 3. Every asset the document references must actually be fetchable. A stale
//    .next directory serves HTML pointing at chunk names that no longer exist;
//    the page then loads unstyled and un-hydrated, so every click is a no-op
//    and the app looks catastrophically broken when only the build is stale.
const assets = [
  ...new Set(
    [...page.body.matchAll(/(?:href|src)="(\/_next\/[^"]+)"/g)].map((match) =>
      match[1].replace(/&amp;/g, "&")
    )
  ),
];
notes.push(`referenced build assets: ${assets.length}`);

let cssBytes = 0;
for (const asset of assets) {
  let result;
  try {
    result = await get(`${BASE}${asset}`);
  } catch (error) {
    problems.push(`asset request failed: ${asset} (${error?.message ?? error})`);
    continue;
  }
  if (!result.ok) {
    problems.push(`asset ${result.status}: ${asset} — stale build, restart the dev server`);
    continue;
  }
  if (asset.includes(".css")) cssBytes += result.body.length;
}

// 4. Tailwind must have compiled. An empty stylesheet renders raw HTML, which
//    is the other failure that masquerades as a broken application.
if (assets.some((asset) => asset.includes(".css"))) {
  if (cssBytes < 5000) {
    problems.push(`stylesheet is only ${cssBytes} bytes — Tailwind did not compile`);
  } else {
    notes.push(`stylesheet: ${cssBytes.toLocaleString()} bytes compiled`);
  }
} else {
  problems.push("the document references no stylesheet at all");
}

if (problems.length) {
  notes.push("The server is running but serving bad content. A restart usually clears");
  notes.push("a stale build: npm run dev:restart");
  report("SERVER UP, APP NOT HEALTHY", 3);
}

notes.push("Server and assets are sound. A failing test run now points at real app code.");
report("HEALTHY", 0);
