/**
 * MP-CTO-013 — Snake Mobile Control Only (10 P0 gates).
 * Usage: PLAYWRIGHT_BROWSERS_PATH=0 QA_BASE_URL=<url> node tools/qa/mp-cto-013-mobile.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import { dragFloatingPad, enterGame, invitePath as mpInvitePath } from "./lib/mp-common.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const COMMIT = process.env.QA_COMMIT ?? "local";
const OUT = join(ROOT, "docs/qa/cpo/mp-cto-013");
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

function invitePath(room, extra = "") {
  return mpInvitePath("snake", room, extra, "/flagship/snake-io/play");
}

async function readWorldTick(page) {
  return page.evaluate(() => {
    const stats = window.__MP_PLATFORM_001__?.getStats?.();
    if (stats && typeof stats.tick === "number") return stats.tick;
    return window.__SNAKE_ENGINE_AUDIT__?.tick?.lastWorldTick ?? 0;
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

async function waitMobilePadReady(page) {
  await page.waitForFunction(() => window.__SNAKE_LOOP_DIAG__?.enabled === true, { timeout: 45_000 });
  await page.locator('[data-testid="mp-mobile-control-pad"]').waitFor({ state: "visible", timeout: 45_000 });
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

async function enterSnake(page) {
  await page.goto(`${BASE}${invitePath("WORLD-QA013", "debug=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForURL(/snake-io\/play/, { timeout: 45_000 }).catch(() => {});
  await enterGame(page, "snake");
  await page.waitForSelector('[data-testid="snake-world-canvas"]', { timeout: 45_000 });
  await page.waitForTimeout(1500);
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

async function touchPad(page, cx, cy, dx = 0, dy = 0) {
  const overlay = page.locator('[data-testid="mp-mobile-control-pad"]');
  await overlay.dispatchEvent("pointerdown", {
    pointerId: 11,
    clientX: cx,
    clientY: cy,
    pointerType: "touch",
    bubbles: true,
  });
  if (dx || dy) {
    await overlay.dispatchEvent("pointermove", {
      pointerId: 11,
      clientX: cx + dx,
      clientY: cy + dy,
      pointerType: "touch",
      bubbles: true,
    });
  }
  return overlay;
}

async function releasePad(page, cx, cy) {
  const overlay = page.locator('[data-testid="mp-mobile-control-pad"]');
  await overlay.dispatchEvent("pointerup", {
    pointerId: 11,
    clientX: cx,
    clientY: cy,
    pointerType: "touch",
    bubbles: true,
  });
}

async function runMobileP0(page) {
  const iphone = devices["iPhone 13"];
  await page.setViewportSize(iphone.viewport);
  await enterSnake(page);
  await waitSnakeAlive(page);

  const regressionEarly = await readRegression(page);
  p0.snakeRegression = mark(
    "p0-snake-regression",
    regressionEarly.canvas && regressionEarly.alive && regressionEarly.tick > 0,
    regressionEarly
  );

  let dirPass = 0;
  await waitMobilePadReady(page);
  const dirs = ["right", "down", "left", "up"];
  for (const dir of dirs) {
    if (await assertPadDirection(page, dir)) dirPass += 1;
  }
  p0.directionInput = mark("p0-direction-input", dirPass >= 4, { dirPass, dirs });

  const vp = page.viewportSize() ?? { width: 390, height: 844 };
  const touchX = Math.floor(vp.width * 0.22);
  const touchY = Math.floor(vp.height * 0.45);
  const overlay = page.locator('[data-testid="mp-mobile-control-pad"]');

  p0.floatingPad = mark(
    "p0-floating-pad-visible",
    (await overlay.count()) > 0 && (await overlay.isVisible())
  );

  await touchPad(page, touchX, touchY);
  await page.waitForTimeout(120);
  const joy = page.locator('[data-testid="mp-floating-joystick"]');
  p0.padPosition = mark(
    "p0-pad-at-touch",
    (await joy.count()) > 0 &&
      (await joy.getAttribute("data-touch-x")) === String(touchX) &&
      (await joy.getAttribute("data-touch-y")) === String(touchY),
    { touchX, touchY }
  );
  p0.floatingPadShow = mark("p0-floating-pad-on-touch", (await joy.count()) > 0);

  const joyBox = await joy.boundingBox().catch(() => null);
  p0.screenInterference = mark(
    "p0-screen-interference",
    joyBox != null && joyBox.width <= 120 && joyBox.height <= 120,
    joyBox ?? {}
  );

  const uiSelect = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="mp-top10"]');
    if (!el) return { found: false };
    const style = getComputedStyle(el);
    return { found: true, userSelect: style.userSelect || style.webkitUserSelect };
  });
  p0.uiSelectionBlock = mark(
    "p0-ui-selection-block",
    uiSelect.found && uiSelect.userSelect === "none",
    uiSelect
  );

  await releasePad(page, touchX, touchY);
  await page.waitForTimeout(120);
  p0.padRelease = mark(
    "p0-pad-hidden-on-release",
    (await page.locator('[data-testid="mp-floating-joystick"]').count()) === 0
  );

  const tickBeforeHold = await readWorldTick(page);
  await dragFloatingPad(page, "right");
  await page.waitForTimeout(500);
  const tickAfterHold = await readWorldTick(page);
  p0.holdMovement = mark("p0-hold-movement", tickAfterHold > tickBeforeHold + 2, {
    tickBeforeHold,
    tickAfterHold,
  });

  p0.mobileRegression = mark(
    "p0-mobile-regression",
    (await overlay.count()) > 0 &&
      (await page.locator('[data-testid="mp-pad-action-boost"]').count()) > 0
  );

  await page.screenshot({ path: join(SHOTS, "snake-mobile-p0.png"), fullPage: true });
}

async function runPcRegression(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await enterSnake(page);
  const inputBefore = await page.evaluate(() => window.__SNAKE_LOOP_DIAG__?.input ?? 0);
  await page.locator('[data-testid="snake-world-canvas"]').click({ timeout: 5000 }).catch(() => {});
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(400);
  const inputAfter = await page.evaluate(() => window.__SNAKE_LOOP_DIAG__?.input ?? 0);
  const lastDirection = await page.evaluate(() => window.__SNAKE_LOOP_DIAG__?.lastInput ?? null);
  p0.pcRegression = mark("p0-pc-regression", inputAfter > inputBefore, {
    inputBefore,
    inputAfter,
    lastDirection,
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ hasTouch: true });
  try {
    const mobilePage = await ctx.newPage();
    try {
      await runMobileP0(mobilePage);
    } finally {
      await mobilePage.close();
    }
    const pcPage = await ctx.newPage();
    try {
      await runPcRegression(pcPage);
    } finally {
      await pcPage.close();
    }
  } finally {
    await ctx.close();
    await browser.close();
  }

  const keys = [
    "floatingPadShow",
    "padPosition",
    "uiSelectionBlock",
    "directionInput",
    "holdMovement",
    "padRelease",
    "screenInterference",
    "snakeRegression",
    "pcRegression",
    "mobileRegression",
  ];
  const passed = keys.filter((k) => p0[k]).length;
  const total = keys.length;
  const allPass = passed === total;
  const report = {
    gate: "MP-CTO-013",
    scope: "Snake Mobile Control Only",
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
  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n=== MP-CTO-013 ${passed}/${total} ${report.ctoFinal} ===`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
