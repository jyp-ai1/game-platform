/** Sprint17 STEP2 — Snake smoke ENTER→play→exit. No Death/Loot/LB changes. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3020";
const OUT =
  process.env.SMOKE_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cpo-sprint17-step2-smoke");
const COMMIT = process.env.SNAKE_PROBE_COMMIT ?? "local";

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const steps = [];
const mark = (name, ok, detail = {}) => steps.push({ name, ok, ...detail, t: new Date().toISOString() });

const log = { task: "STEP2_SNAKE_SMOKE", commit: COMMIT, base: BASE, startedAt: new Date().toISOString() };

try {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.screenshot({ path: join(OUT, "01-home.png") });
  mark("HOME", true, { title: await page.title() });

  const url = `${BASE}/flagship/snake-io/play?room=WORLD&debug=1`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  log.url = url;
  await page.screenshot({ path: join(OUT, "02-entry.png") });
  mark("ENTRY_PAGE", true);

  await page.getByRole("button", { name: "START", exact: true }).click({ timeout: 15_000 }).catch(() => {});
  await page.getByRole("button", { name: /ENTER WORLD/i }).click({ timeout: 15_000 }).catch(() => {});
  const board = page.locator(".touch-none").first();
  await board.waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1500);
  await board.click({ position: { x: 240, y: 240 } }).catch(() => {});
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "03-world.png") });

  const playing = await page.evaluate(() => {
    const a = window.__SNAKE_ENGINE_AUDIT__;
    const l = window.__SNAKE_LOOP_DIAG__;
    return {
      phase: l?.phase ?? a?.localPlayer?.gamePhase ?? null,
      exists: !!a?.localSnake?.exists,
      alive: !!a?.localSnake?.alive,
      segments: a?.localSnake?.segments ?? 0,
      snakes: a?.render?.snakesAlive ?? l?.worldSnakeCount ?? 0,
      foods: a?.render?.foods ?? 0,
    };
  });
  mark("WORLD_PLAYING", playing.exists && playing.segments > 0, playing);

  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(350);
  }
  await page.screenshot({ path: join(OUT, "04-moved.png") });
  mark("MOVE", true);

  // Exit / logout path — prefer in-game 나가기, then home
  const exitBtn = page.getByRole("button", { name: /나가기|Exit|Leave|Logout/i }).first();
  const exitVisible = await exitBtn.isVisible().catch(() => false);
  if (exitVisible) {
    await exitBtn.click({ timeout: 10_000 });
    await page.waitForTimeout(1500);
    mark("EXIT_CLICK", true);
  } else {
    mark("EXIT_CLICK", false, { reason: "no exit button" });
  }
  await page.screenshot({ path: join(OUT, "05-after-exit.png") });

  // Soft logout: clear guest session markers if present, land on home
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(() => {
    try {
      localStorage.removeItem("play29:session");
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.screenshot({ path: join(OUT, "06-home-logout.png") });
  mark("LOGOUT_HOME", true, { path: "/" });

  log.endedAt = new Date().toISOString();
  log.steps = steps;
  log.pass = steps.every((s) => s.ok);
  writeFileSync(join(OUT, "smoke-report.json"), JSON.stringify(log, null, 2));
  console.log(JSON.stringify({ pass: log.pass, steps }, null, 2));
  if (!log.pass) process.exitCode = 1;
} catch (err) {
  log.error = String(err?.stack ?? err);
  log.steps = steps;
  log.pass = false;
  writeFileSync(join(OUT, "smoke-report.json"), JSON.stringify(log, null, 2));
  console.error(log.error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
