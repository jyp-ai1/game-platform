/**
 * MP-CTO-012 — Bomber Mobile Control Only (10 P0 gates).
 * Usage: PLAYWRIGHT_BROWSERS_PATH=0 QA_BASE_URL=<url> node tools/qa/mp-cto-012-mobile.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import { enterGame, invitePath as mpInvitePath, dragFloatingPad } from "./lib/mp-common.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const COMMIT = process.env.QA_COMMIT ?? "local";
const OUT = join(ROOT, "docs/qa/cpo/mp-cto-012");
const SHOTS = join(OUT, "screenshots");

mkdirSync(SHOTS, { recursive: true });

function invitePath(room, extra = "") {
  return mpInvitePath("bomber", room, extra);
}

const p0 = {};
const checks = [];

function mark(name, ok, detail = {}) {
  const row = { name, ok, ...detail, t: new Date().toISOString() };
  checks.push(row);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  return ok;
}

async function enterBomber(page) {
  await page.goto(`${BASE}${invitePath("BOMBER-D", "mp_qa_local=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "bomber");
  await page.waitForFunction(() => typeof window.__BOMBER_QA_MOVE__ === "function", {
    timeout: 12_000,
  });
}

async function centerPlayer(page, targetX = 7, targetY = 6) {
  for (let i = 0; i < 56; i++) {
    const pos = await readGrid(page);
    if (!pos) break;
    if (pos.x === targetX && pos.y === targetY) break;
    let dx = pos.x < targetX ? 1 : pos.x > targetX ? -1 : 0;
    let dy = pos.y < targetY ? 1 : pos.y > targetY ? -1 : 0;
    if (pos.x >= 12 && dx > 0) dx = -1;
    if (pos.x <= 1 && dx < 0) dx = 0;
    if (pos.y <= 1 && dy < 0) dy = 0;
    if (pos.y >= 10 && dy > 0) dy = 0;
    if (dx === 0 && dy === 0) {
      if (pos.x >= 12) dx = -1;
      else if (pos.y <= 1) dy = 1;
      else break;
    }
    await page.evaluate(([x, y]) => window.__BOMBER_QA_MOVE__?.(x, y), [dx, dy]);
    await page.waitForTimeout(90);
  }
}

async function readGrid(page) {
  return page.evaluate(() => {
    const w = window.__BOMBER_QA__?.();
    if (w?.local) return { x: w.local.x, y: w.local.y };
    const el = document.querySelector('[data-testid="bomber-local-player"]');
    if (!el) return null;
    return {
      x: Number(el.getAttribute("data-grid-x")),
      y: Number(el.getAttribute("data-grid-y")),
    };
  });
}

async function touchPad(page, cx, cy, dx = 0, dy = 0, holdMs = 0) {
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
  if (holdMs > 0) await page.waitForTimeout(holdMs);
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
  await enterBomber(page);

  const vp = page.viewportSize() ?? { width: 390, height: 844 };
  const touchX = Math.floor(vp.width * 0.22);
  const touchY = Math.floor(vp.height * 0.58);
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
  await releasePad(page, touchX, touchY);
  await page.waitForTimeout(120);
  p0.padRelease = mark(
    "p0-pad-hidden-on-release",
    (await page.locator('[data-testid="mp-floating-joystick"]').count()) === 0
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

  await centerPlayer(page);

  const pos0 = await readGrid(page);
  const stepX = pos0 && pos0.x >= 12 ? -1 : 1;
  const x0 = pos0?.x ?? 1;
  await page.evaluate(([dx]) => window.__BOMBER_QA_MOVE__?.(dx, 0), [stepX]);
  await page.waitForTimeout(80);
  const x1 = (await readGrid(page))?.x ?? x0;
  await page.evaluate(([dx]) => window.__BOMBER_QA_MOVE__?.(dx, 0), [stepX]);
  await page.waitForTimeout(80);
  const x2 = (await readGrid(page))?.x ?? x1;
  p0.lightning = mark(
    "p0-lightning-one-cell-per-input",
    Math.abs(x1 - x0) === 1 && Math.abs(x2 - x1) === 1,
    { x0, x1, x2, stepX }
  );

  let dirPass = 0;
  for (const dir of ["right", "left", "down", "up"]) {
    const before = await readGrid(page);
    await dragFloatingPad(page, dir);
    await page.waitForTimeout(220);
    const after = await readGrid(page);
    if (!before || !after) continue;
    const moved = after.x !== before.x || after.y !== before.y;
    if (moved) dirPass += 1;
  }
  p0.directionInput = mark("p0-direction-input", dirPass >= 4, { dirPass });

  const holdBefore = await readGrid(page);
  await touchPad(page, touchX, touchY, 55, 0, 950);
  await releasePad(page, touchX + 55, touchY);
  await page.waitForTimeout(200);
  const holdAfter = await readGrid(page);
  const holdDist =
    holdBefore && holdAfter
      ? Math.abs(holdAfter.x - holdBefore.x) + Math.abs(holdAfter.y - holdBefore.y)
      : 0;
  p0.holdMovement = mark("p0-hold-movement", holdDist >= 2, { holdBefore, holdAfter, holdDist });

  const posForWall = await readGrid(page);
  const towardWallDx = (posForWall?.x ?? 7) >= 10 ? 1 : (posForWall?.x ?? 7) <= 2 ? -1 : 1;
  let prev = posForWall;
  for (let i = 0; i < 16; i++) {
    await page.evaluate(([dx]) => window.__BOMBER_QA_MOVE__?.(dx, 0), [towardWallDx]);
    await page.waitForTimeout(80);
    const cur = await readGrid(page);
    if (!cur || (prev && cur.x === prev.x && cur.y === prev.y)) break;
    prev = cur;
  }
  const wallX = prev?.x ?? 0;
  await page.evaluate(([dx]) => window.__BOMBER_QA_MOVE__?.(dx, 0), [towardWallDx]);
  await page.waitForTimeout(80);
  const blocked = await readGrid(page);
  p0.gridCollision = mark(
    "p0-grid-collision",
    blocked != null && blocked.x === wallX,
    { wallX, blocked, towardWallDx }
  );

  const bombsBefore = await page.evaluate(() => window.__BOMBER_QA__?.().bombs.length ?? 0);
  const bombZoneX = Math.floor(vp.width * 0.78);
  const bombZoneY = Math.floor(vp.height * 0.5);
  await overlay.dispatchEvent("pointerdown", {
    pointerId: 12,
    clientX: bombZoneX,
    clientY: bombZoneY,
    pointerType: "touch",
    bubbles: true,
  });
  await overlay.dispatchEvent("pointerup", {
    pointerId: 12,
    clientX: bombZoneX,
    clientY: bombZoneY,
    pointerType: "touch",
    bubbles: true,
  });
  await page.waitForTimeout(300);
  const bombsAfter = await page.evaluate(() => window.__BOMBER_QA__?.().bombs.length ?? 0);
  p0.bomb = mark("p0-bomb-action", bombsAfter > bombsBefore, { bombsBefore, bombsAfter });

  await page.screenshot({ path: join(SHOTS, "bomber-mobile-p0.png"), fullPage: true });
}

async function runPcRegression(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await enterBomber(page);
  const before = await readGrid(page);
  await page.locator('[data-testid="mp-fs-shell"]').click({ timeout: 5000 }).catch(() => {});
  const key = before && before.x >= 10 ? "ArrowLeft" : "ArrowRight";
  await page.keyboard.press(key);
  await page.waitForTimeout(300);
  await page.keyboard.press(key);
  await page.waitForTimeout(300);
  const after = await readGrid(page);
  const moved =
    before && after ? Math.abs(after.x - before.x) + Math.abs(after.y - before.y) >= 1 : false;
  p0.pcRegression = mark("p0-pc-regression", moved, { before, after, key });
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
    "padRelease",
    "uiSelectionBlock",
    "directionInput",
    "holdMovement",
    "gridCollision",
    "bomb",
    "lightning",
    "pcRegression",
  ];
  const passed = keys.filter((k) => p0[k]).length;
  const total = keys.length;
  const allPass = passed === total;
  const report = {
    gate: "MP-CTO-012",
    scope: "Bomber Mobile Control Only",
    commit: COMMIT,
    base: BASE,
    finishedAt: new Date().toISOString(),
    p0: Object.fromEntries(keys.map((k) => [k, !!p0[k]])),
    passed,
    total,
    ctoFinal: allPass ? "PASS" : "FAIL",
    checks,
    realDevice: "PENDING",
  };
  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n=== MP-CTO-012 ${passed}/${total} ${report.ctoFinal} ===`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
