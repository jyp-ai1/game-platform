/**
 * MP-CTO-014 — Agar Mobile Control Only (13 P0 gates).
 * Usage: PLAYWRIGHT_BROWSERS_PATH=0 QA_BASE_URL=<url> QA_COMMIT=<sha> node tools/qa/mp-cto-014-mobile.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import { dragFloatingPad, invitePath as mpInvitePath } from "./lib/mp-common.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const COMMIT = process.env.QA_COMMIT ?? "local";
const OUT = join(ROOT, "docs/qa/cpo/mp-cto-014");
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
  return mpInvitePath("agar", room, extra);
}

function dist(a, b) {
  if (!a || !b) return 0;
  return Math.hypot((b.x ?? 0) - (a.x ?? 0), (b.y ?? 0) - (a.y ?? 0));
}

async function readAgarQa(page) {
  return page.evaluate(() => window.__AGAR_QA__?.() ?? null);
}

async function clickEnter(page) {
  const enter = page.locator('[data-testid="mp-enter-world"]');
  if ((await enter.count()) > 0) {
    await enter.click({ timeout: 15_000 });
  } else {
    await page.getByRole("button", { name: /^ENTER$/i }).first().click({ timeout: 15_000 });
  }
}

async function waitAgarAlive(page, maxTries = 10) {
  for (let i = 0; i < maxTries; i += 1) {
    const ok = await page
      .waitForFunction(
        () => {
          const qa = window.__AGAR_QA__?.();
          return !!(qa?.started && qa?.alive && qa.cells > 0 && qa.tick > 0);
        },
        { timeout: 15_000 }
      )
      .then(() => true)
      .catch(() => false);
    if (ok) return;

    const retry = page.locator('[data-testid="mp-death-retry"]');
    if ((await retry.count()) > 0 && (await retry.isVisible())) {
      await retry.click({ timeout: 8_000 }).catch(() => {});
      await page.waitForTimeout(1200);
      await clickEnter(page);
      await page.waitForTimeout(1500);
      continue;
    }
    if ((await page.locator('[data-testid="mp-enter-world"]').count()) > 0) {
      await clickEnter(page);
      await page.waitForTimeout(1500);
      continue;
    }
    await page.waitForTimeout(800);
  }
  throw new Error("Agar did not reach alive playable state");
}

async function enterAgar(page, opts = { mobile: true }) {
  await page.goto(`${BASE}${invitePath("WORLD-QA014", "mp_qa_pad=1&mp_qa_split=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await clickEnter(page);
  await waitAgarAlive(page);
  if (opts.mobile) {
    await page.waitForSelector('[data-testid="mp-mobile-control-pad"]', {
      state: "visible",
      timeout: 30_000,
    });
    await page.waitForTimeout(500);
  } else {
    await page.waitForTimeout(800);
  }
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

async function tapAction(page, action) {
  const vp = page.viewportSize() ?? { width: 390, height: 844 };
  const x = Math.floor(vp.width * 0.75);
  const y = action === "split" ? Math.floor(vp.height * 0.25) : Math.floor(vp.height * 0.75);
  const overlay = page.locator('[data-testid="mp-mobile-control-pad"]');
  await overlay.dispatchEvent("pointerdown", {
    pointerId: 21,
    clientX: x,
    clientY: y,
    pointerType: "touch",
    bubbles: true,
  });
  await page.waitForTimeout(80);
  await overlay.dispatchEvent("pointerup", {
    pointerId: 21,
    clientX: x,
    clientY: y,
    pointerType: "touch",
    bubbles: true,
  });
}

async function assertPadDirection(page, dir) {
  await page.waitForTimeout(100);
  const before = await readAgarQa(page);
  if (!before?.alive) return false;
  await shortDragPad(page, dir);
  await page.waitForTimeout(300);
  let after = await readAgarQa(page);
  let ok =
    !!after?.alive &&
    (Math.abs(after.aimX - before.aimX) > 0.5 || Math.abs(after.aimY - before.aimY) > 0.5);
  if (!ok && after?.alive) {
    await dragFloatingPad(page, dir);
    await page.waitForTimeout(300);
    after = await readAgarQa(page);
    ok =
      !!after?.alive &&
      (Math.abs(after.aimX - before.aimX) > 0.5 || Math.abs(after.aimY - before.aimY) > 0.5);
  }
  return ok;
}

async function runMobileP0(page) {
  const iphone = devices["iPhone 13"];
  await page.setViewportSize(iphone.viewport);
  await enterAgar(page);

  const startQa = await readAgarQa(page);
  p0.gameStart = mark(
    "p0-game-start",
    !!startQa?.started && startQa.alive && startQa.tick > 0,
    startQa ?? {}
  );

  const regressionEarly = await readAgarQa(page);
  p0.agarRegression = mark(
    "p0-agar-regression",
    regressionEarly?.alive && regressionEarly.tick > 0 && regressionEarly.mass > 0,
    regressionEarly ?? {}
  );

  const overlay = page.locator('[data-testid="mp-mobile-control-pad"]');
  p0.floatingPadShow = mark(
    "p0-floating-pad-visible",
    (await overlay.count()) > 0 && (await overlay.isVisible())
  );

  const vp = page.viewportSize() ?? { width: 390, height: 844 };
  const touchX = Math.floor(vp.width * 0.22);
  const touchY = Math.floor(vp.height * 0.45);

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

  const joyBox = await joy.boundingBox().catch(() => null);
  const splitZone = page.locator('[data-testid="mp-pad-action-split"]');
  const ejectZone = page.locator('[data-testid="mp-pad-action-eject"]');
  p0.screenInterference = mark(
    "p0-screen-interference",
    joyBox != null &&
      joyBox.width <= 120 &&
      joyBox.height <= 120 &&
      (await splitZone.count()) > 0 &&
      (await ejectZone.count()) > 0,
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

  const holdStart = await readAgarQa(page);
  await touchPad(page, touchX, touchY, 55, 0, 500);
  const holdMid = await readAgarQa(page);
  await page.waitForTimeout(1800);
  const holdEnd = await readAgarQa(page);
  await releasePad(page, touchX + 55, touchY);
  p0.holdMovement = mark(
    "p0-hold-movement",
    holdEnd?.alive &&
      dist(holdStart, holdMid) > 0.8 &&
      dist(holdMid, holdEnd) > 0.8,
    { d0: dist(holdStart, holdMid), d1: dist(holdMid, holdEnd), holdStart, holdEnd }
  );
  p0.inputPersistence = mark(
    "p0-input-persistence",
    holdEnd?.alive && dist(holdStart, holdEnd) > 4,
    { totalDist: dist(holdStart, holdEnd) }
  );

  await page.waitForTimeout(120);
  p0.padRelease = mark(
    "p0-pad-hidden-on-release",
    (await page.locator('[data-testid="mp-floating-joystick"]').count()) === 0
  );

  let dirPass = 0;
  for (const dir of ["down", "left", "up", "right"]) {
    if (await assertPadDirection(page, dir)) dirPass += 1;
  }
  p0.directionInput = mark("p0-direction-input", dirPass >= 4, { dirPass });

  const splitBefore = await readAgarQa(page);
  await tapAction(page, "split");
  await page.waitForTimeout(700);
  const splitAfter = await readAgarQa(page);
  p0.split = mark(
    "p0-split",
    (splitAfter?.cells ?? 0) > (splitBefore?.cells ?? 0) || (splitAfter?.cells ?? 0) >= 2,
    { cellsBefore: splitBefore?.cells, cellsAfter: splitAfter?.cells }
  );

  const ejectBefore = await readAgarQa(page);
  await tapAction(page, "eject");
  await page.waitForTimeout(400);
  const ejectAfter = await readAgarQa(page);
  p0.eject = mark(
    "p0-eject",
    ejectAfter != null && ejectBefore != null && ejectAfter.mass < ejectBefore.mass,
    { massBefore: ejectBefore?.mass, massAfter: ejectAfter?.mass }
  );

  await page.screenshot({ path: join(SHOTS, "agar-mobile-p0.png"), fullPage: true });
}

async function runPcRegression(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await enterAgar(page, { mobile: false });
  const before = await readAgarQa(page);
  const board = page.locator(".absolute.inset-0.touch-none.overflow-hidden").first();
  const box = await board.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.35);
    await page.waitForTimeout(400);
    await page.mouse.up();
  }
  const afterAim = await readAgarQa(page);
  const aimOk =
    before &&
    afterAim &&
    (Math.abs(afterAim.aimX - before.aimX) > 0.5 || Math.abs(afterAim.aimY - before.aimY) > 0.5);

  await page.keyboard.press("Space");
  await page.waitForTimeout(500);
  const afterSplit = await readAgarQa(page);
  p0.pcRegression = mark("p0-pc-regression", aimOk && (afterSplit?.cells ?? 0) >= 1, {
    aimOk,
    cells: afterSplit?.cells,
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
    "gameStart",
    "floatingPadShow",
    "padPosition",
    "directionInput",
    "holdMovement",
    "inputPersistence",
    "padRelease",
    "split",
    "eject",
    "uiSelectionBlock",
    "screenInterference",
    "pcRegression",
    "agarRegression",
  ];
  const passed = keys.filter((k) => p0[k]).length;
  const total = keys.length;
  const allPass = passed === total;
  const report = {
    gate: "MP-CTO-014",
    scope: "Agar Mobile Control Only",
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
  console.log(`\n=== MP-CTO-014 ${passed}/${total} ${allPass ? "PASS" : "FAIL"} ===`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
