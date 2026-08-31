/**
 * MP-CTO-016 — Snake 실사용 안정성 (10 P0 gates).
 * Usage: PLAYWRIGHT_BROWSERS_PATH=0 QA_BASE_URL=<url> QA_COMMIT=<sha> node tools/qa/mp-cto-016-snake-ux.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import { dragFloatingPad, enterGame, invitePath as mpInvitePath } from "./lib/mp-common.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.QA_BASE_URL ?? "https://game29.vercel.app";
const COMMIT = process.env.QA_COMMIT ?? "local";
const OUT = join(ROOT, "docs/qa/cpo/mp-cto-016");
const SHOTS = join(OUT, "screenshots");

mkdirSync(SHOTS, { recursive: true });

const p0 = {};
const checks = [];

function mark(name, ok, detail = {}) {
  const row = { name, ok, ...detail, t: new Date().toISOString() };
  checks.push(row);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  return ok;
}

function snakeInvitePath(room, extra = "") {
  return mpInvitePath("snake", room, extra, "/flagship/snake-io/play");
}

async function readWorldTick(page) {
  return page.evaluate(() => {
    const stats = window.__MP_PLATFORM_001__?.getStats?.();
    if (stats && typeof stats.tick === "number") return stats.tick;
    return window.__SNAKE_ENGINE_AUDIT__?.tick?.lastWorldTick ?? 0;
  });
}

async function readRegression(page) {
  return page.evaluate(() => {
    const canvas = !!document.querySelector('[data-testid="snake-world-canvas"]');
    const tick =
      window.__MP_PLATFORM_001__?.getStats?.()?.tick ??
      window.__SNAKE_ENGINE_AUDIT__?.tick?.lastWorldTick ??
      0;
    const audit = window.__SNAKE_ENGINE_AUDIT__;
    const alive = audit?.localSnake?.alive ?? tick > 0;
    const exists = audit?.localSnake?.exists ?? tick > 0;
    return { canvas, alive, exists, tick };
  });
}

async function waitSnakeAlive(page) {
  await page.waitForFunction(
    () => {
      const tick = window.__MP_PLATFORM_001__?.getStats?.()?.tick;
      if (typeof tick === "number" && tick > 0) return true;
      const a = window.__SNAKE_ENGINE_AUDIT__;
      return !!(a?.localSnake?.exists && a?.localSnake?.alive);
    },
    { timeout: 60_000 }
  );
}

async function waitMobilePadReady(page) {
  await page.waitForFunction(() => window.__SNAKE_LOOP_DIAG__?.enabled === true, { timeout: 45_000 });
  await page.locator('[data-testid="mp-mobile-control-pad"]').waitFor({ state: "visible", timeout: 45_000 });
}

const TURN_RIGHT = { right: "down", down: "left", left: "up", up: "right" };

async function nextValidDirs(page) {
  const heading = await page.evaluate(() => {
    return (
      window.__SNAKE_ENGINE_AUDIT__?.input?.lastDirection ??
      window.__SNAKE_LOOP_DIAG__?.lastInput ??
      "right"
    );
  });
  const dirs = [];
  let h = heading;
  for (let i = 0; i < 4; i += 1) {
    h = TURN_RIGHT[h] ?? "down";
    dirs.push(h);
  }
  return dirs;
}

async function readLastInput(page) {
  return page.evaluate(() => {
    return (
      window.__SNAKE_ENGINE_AUDIT__?.input?.lastDirection ??
      window.__SNAKE_LOOP_DIAG__?.lastInput ??
      null
    );
  });
}

async function shortDragPad(page, dir) {
  const overlay = page.locator('[data-testid="mp-mobile-control-pad"]');
  const vp = page.viewportSize() ?? { width: 390, height: 844 };
  const cx = Math.floor(vp.width * 0.25);
  const cy = Math.floor(vp.height * 0.45);
  const dx = dir === "right" ? 55 : dir === "left" ? -55 : 0;
  const dy = dir === "down" ? 55 : dir === "up" ? -55 : 0;
  await overlay.dispatchEvent("pointerdown", {
    pointerId: 7,
    clientX: cx,
    clientY: cy,
    pointerType: "touch",
    bubbles: true,
  });
  await overlay.dispatchEvent("pointermove", {
    pointerId: 7,
    clientX: cx + dx,
    clientY: cy + dy,
    pointerType: "touch",
    bubbles: true,
  });
  await page.waitForTimeout(450);
  await overlay.dispatchEvent("pointerup", {
    pointerId: 7,
    clientX: cx + dx,
    clientY: cy + dy,
    pointerType: "touch",
    bubbles: true,
  });
}

async function assertPadDirection(page, dir) {
  await page.waitForTimeout(120);
  await dragFloatingPad(page, dir);
  await page.waitForTimeout(350);
  let last = await readLastInput(page);
  if (last !== dir) {
    await shortDragPad(page, dir);
    await page.waitForTimeout(350);
    last = await readLastInput(page);
  }
  return last === dir;
}

async function enterSnakeWorld(page, room = "WORLD-QA016", extra = "debug=1") {
  await page.goto(`${BASE}${snakeInvitePath(room, extra)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForURL(/snake-io\/play/, { timeout: 45_000 }).catch(() => {});
  await enterGame(page, "snake");
  await page.waitForSelector('[data-testid="snake-world-canvas"]', { timeout: 45_000 });
  await page.waitForTimeout(1200);
  const vpW = page.viewportSize()?.width ?? 390;
  if (vpW < 1024) {
    await page
      .waitForFunction(() => window.__SNAKE_ENGINE_AUDIT__?.localSnake?.exists, {
        timeout: 45_000,
      })
      .catch(() => {});
    await dragFloatingPad(page, "right");
  } else {
    await page.locator('[data-testid="snake-world-canvas"]').click({ timeout: 5000 }).catch(() => {});
    await page.keyboard.press("ArrowRight");
  }
  await page.waitForTimeout(800);
}

async function runP0(page) {
  const iphone = devices["iPhone 13"];
  await page.setViewportSize(iphone.viewport);

  // P0-1 Preview entry — play URL loads without crash (ENTER or canvas/HUD acceptable)
  const resp = await page.goto(`${BASE}/flagship/snake-io/play?room=WORLD-QA016&debug=1`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(1500);
  const hasEnter =
    (await page.locator('[data-testid="mp-enter-world"]').count()) > 0 ||
    (await page.getByRole("button", { name: /^ENTER$/i }).count()) > 0;
  const hasCanvas = (await page.locator('[data-testid="snake-world-canvas"]').count()) > 0;
  const hasHud = (await page.locator('[data-testid="snake-world-hud"]').count()) > 0;
  const entryOk =
    (resp?.ok() ?? true) &&
    page.url().includes("snake-io/play") &&
    !(await page.locator("text=Application error").count()) &&
    (hasEnter || hasCanvas || hasHud);
  p0.previewEntry = mark("p0-preview-entry", entryOk, {
    status: resp?.status() ?? 0,
    hasEnter,
    hasCanvas,
    hasHud,
  });
  await page.screenshot({ path: join(SHOTS, "01-preview-entry.png"), fullPage: true });

  // P0-2 Game start + P0-8 tick/alive (mobile session)
  await enterSnakeWorld(page);
  await waitSnakeAlive(page);
  const reg = await readRegression(page);
  p0.gameStart = mark("p0-game-start", reg.canvas && reg.exists, reg);
  p0.tickAlive = mark("p0-tick-alive", reg.alive && reg.tick > 0, reg);

  await waitMobilePadReady(page);

  // P0-3 Floating pad
  const overlay = page.locator('[data-testid="mp-mobile-control-pad"]');
  p0.floatingPad = mark(
    "p0-floating-pad",
    (await overlay.count()) > 0 && (await overlay.isVisible())
  );

  // P0-4 Direction input (valid turns from current heading)
  let dirPass = 0;
  const dirs = await nextValidDirs(page);
  for (const dir of dirs) {
    if (await assertPadDirection(page, dir)) dirPass += 1;
  }
  p0.directionInput = mark("p0-direction-input", dirPass >= 4, { dirPass, dirs });

  // P0-5 Hold movement
  const tickBeforeHold = await readWorldTick(page);
  await dragFloatingPad(page, "right");
  await page.waitForTimeout(500);
  const tickAfterHold = await readWorldTick(page);
  p0.holdMovement = mark("p0-hold-movement", tickAfterHold > tickBeforeHold + 2, {
    tickBeforeHold,
    tickAfterHold,
  });

  // P0-6 Pad release
  const vp = page.viewportSize() ?? { width: 390, height: 844 };
  const touchX = Math.floor(vp.width * 0.22);
  const touchY = Math.floor(vp.height * 0.45);
  const padOverlay = page.locator('[data-testid="mp-mobile-control-pad"]');
  await padOverlay.dispatchEvent("pointerdown", {
    pointerId: 11,
    clientX: touchX,
    clientY: touchY,
    pointerType: "touch",
    bubbles: true,
  });
  await page.waitForTimeout(120);
  await padOverlay.dispatchEvent("pointerup", {
    pointerId: 11,
    clientX: touchX,
    clientY: touchY,
    pointerType: "touch",
    bubbles: true,
  });
  await page.waitForTimeout(120);
  p0.padRelease = mark(
    "p0-pad-release",
    (await page.locator('[data-testid="mp-floating-joystick"]').count()) === 0
  );

  await page.screenshot({ path: join(SHOTS, "02-mobile-playing.png"), fullPage: true });

  // P0-9 Invite URL entry (fresh navigation)
  await page.goto(`${BASE}${snakeInvitePath("WORLD-QA016", "source=invite")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForURL(/snake-io\/play/, { timeout: 45_000 }).catch(() => {});
  await enterGame(page, "snake");
  await page.waitForSelector('[data-testid="snake-world-canvas"]', { timeout: 45_000 });
  await dragFloatingPad(page, "right");
  await waitSnakeAlive(page);
  const inviteReg = await readRegression(page);
  const inviteEvidence = await page.evaluate(
    () => window.__MP_PLATFORM_001__?.getInviteEvidence?.() ?? null
  );
  p0.inviteStart = mark(
    "p0-invite-start",
    inviteReg.canvas &&
      inviteReg.alive &&
      inviteReg.tick > 0 &&
      (inviteEvidence?.urlRoom === "WORLD-QA016" || inviteEvidence?.sessionRoom === "WORLD-QA016"),
    { inviteReg, inviteEvidence }
  );
  await page.screenshot({ path: join(SHOTS, "03-invite-entry.png"), fullPage: true });

  // P0-7 PC arrow keys
  await page.setViewportSize({ width: 1280, height: 720 });
  await enterSnakeWorld(page);
  const inputBefore = await page.evaluate(() => window.__SNAKE_LOOP_DIAG__?.input ?? 0);
  await page.locator('[data-testid="snake-world-canvas"]').click({ timeout: 5000 }).catch(() => {});
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(400);
  const inputAfter = await page.evaluate(() => window.__SNAKE_LOOP_DIAG__?.input ?? 0);
  const lastDirection = await readLastInput(page);
  p0.pcArrows = mark("p0-pc-arrows", inputAfter > inputBefore, {
    inputBefore,
    inputAfter,
    lastDirection,
  });
  await page.screenshot({ path: join(SHOTS, "04-pc-playing.png"), fullPage: true });

  // P0-10 Regression (canvas + alive + tick + boost pad on mobile viewport)
  await page.setViewportSize(iphone.viewport);
  await enterSnakeWorld(page);
  await waitSnakeAlive(page);
  const finalReg = await readRegression(page);
  p0.snakeRegression = mark(
    "p0-snake-regression",
    finalReg.canvas &&
      finalReg.alive &&
      finalReg.tick > 0 &&
      (await page.locator('[data-testid="mp-pad-action-boost"]').count()) > 0,
    finalReg
  );
  await page.screenshot({ path: join(SHOTS, "05-regression.png"), fullPage: true });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ hasTouch: true });
  try {
    const page = await ctx.newPage();
    await runP0(page);
    await page.close();
  } finally {
    await ctx.close();
    await browser.close();
  }

  const keys = [
    "previewEntry",
    "gameStart",
    "floatingPad",
    "directionInput",
    "holdMovement",
    "padRelease",
    "pcArrows",
    "tickAlive",
    "inviteStart",
    "snakeRegression",
  ];
  const passed = keys.filter((k) => p0[k]).length;
  const total = keys.length;
  const allPass = passed === total;

  const report = {
    gate: "MP-CTO-016",
    scope: "Snake 실사용 안정성 점검",
    commit: COMMIT,
    base: BASE,
    finishedAt: new Date().toISOString(),
    p0: Object.fromEntries(keys.map((k) => [k, !!p0[k]])),
    passed,
    total,
    ctoFinal: allPass ? "PASS" : "FAIL",
    checks,
    realDevice: "PENDING_EXTERNAL",
  };
  writeFileSync(join(OUT, "verify-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n=== MP-CTO-016 ${passed}/${total} ${report.ctoFinal} ===`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
