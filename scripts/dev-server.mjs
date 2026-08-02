/**
 * Start / stop the Next dev server so that it outlives the shell that launched
 * it.
 *
 * Why this exists: running `next dev` straight from an interactive or agent
 * shell makes it a member of that shell's process group. When the session is
 * torn down the whole group is signalled and the server dies silently — its log
 * simply stops, with no error, which reads exactly like an application crash.
 * That misdiagnosis has cost this project hours. Spawning detached puts the
 * server in its own process group owned by init, so it survives.
 *
 * Usage:
 *   node scripts/dev-server.mjs start [--port 3000]
 *   node scripts/dev-server.mjs stop
 *   node scripts/dev-server.mjs status
 */

import { spawn } from "node:child_process";
import { existsSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const PIDFILE = path.join(ROOT, ".dev-server.pid");
const LOGFILE = "/tmp/mml-dev.log";
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

const argv = process.argv.slice(2);
const command = argv[0] ?? "status";
const portIndex = argv.indexOf("--port");
const PORT = portIndex === -1 ? "3000" : argv[portIndex + 1];
const BASE = `http://localhost:${PORT}`;

function readPid() {
  if (!existsSync(PIDFILE)) return null;
  const pid = Number.parseInt(readFileSync(PIDFILE, "utf8").trim(), 10);
  return Number.isInteger(pid) ? pid : null;
}

/** Signal 0 tests for existence without touching the process. */
function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function respondsToHttp(timeoutMs = 2000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(BASE, { signal: controller.signal });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitUntilReady(attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    if (await respondsToHttp()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function start() {
  if (await respondsToHttp()) {
    console.log(`Already serving on ${BASE} — nothing to do.`);
    return 0;
  }

  const log = openSync(LOGFILE, "a");
  const child = spawn(process.execPath, [NEXT_BIN, "dev", "-p", PORT], {
    cwd: ROOT,
    // Polling avoids the macOS file-watcher limit. It also means a concurrent
    // `next build` rewriting .next makes the watcher stat thousands of files at
    // once, which can bury the machine — never build while this is running.
    env: { ...process.env, WATCHPACK_POLLING: "true" },
    detached: true,
    stdio: ["ignore", log, log],
  });
  child.unref();
  writeFileSync(PIDFILE, String(child.pid));

  console.log(`Starting dev server (pid ${child.pid}), logging to ${LOGFILE} ...`);
  if (!(await waitUntilReady())) {
    console.error(`Server did not answer on ${BASE} in time. Check ${LOGFILE}.`);
    return 1;
  }
  console.log(`Ready on ${BASE}`);
  return 0;
}

function stop() {
  const pid = readPid();
  if (!isAlive(pid)) {
    console.log("No dev server recorded as running.");
    rmSync(PIDFILE, { force: true });
    return 0;
  }
  // Negative pid signals the whole group, which catches the next-server child.
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }
  rmSync(PIDFILE, { force: true });
  console.log(`Stopped dev server (pid ${pid}).`);
  return 0;
}

async function status() {
  const pid = readPid();
  const alive = isAlive(pid);
  const serving = await respondsToHttp();
  console.log(`pidfile : ${pid ?? "(none)"}`);
  console.log(`process : ${alive ? "running" : "not running"}`);
  console.log(`http    : ${serving ? `answering on ${BASE}` : "no response"}`);
  return serving ? 0 : 1;
}

const handlers = { start, stop, status };
if (!handlers[command]) {
  console.error(`Unknown command "${command}". Use start, stop or status.`);
  process.exit(2);
}
process.exit((await handlers[command]()) ?? 0);
