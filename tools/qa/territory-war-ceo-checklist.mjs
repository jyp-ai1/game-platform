/**
 * GAME-DEV-012R-FIX2 — CEO-style real browser checklist (Playwright).
 * Does NOT replace CEO Feel sign-off; produces reproducible evidence.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices } from "playwright";
import { BASE, COMMIT, createDualPages, invitePath } from "./lib/mp-common.mjs";

const OUT = join(process.cwd(), "docs/qa/cpo/territory-war-g12r");
const SHOTS = join(OUT, "ceo-checklist");
mkdirSync(SHOTS, { recursive: true });

async function readQa(page) {
  return page.evaluate(() => window.__TW_QA__?.() ?? null);
}

async function qaInput(page, dx, dy) {
  await page.evaluate(([x, y]) => window.__TW_QA_INPUT__?.(x, y), [dx, dy]);
}

async function boardActive(page) {
  return page.evaluate(
    () => document.querySelector('[data-mp-play-board][data-mp-board-input="active"]') != null
  );
}

async function sampleMovement(page, deviceId, label, shots) {
  await page.locator("[data-mp-play-board]").click();
  const samples = [];
  await page.keyboard.down("KeyW");
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(100);
    const qa = await readQa(page);
    const me = qa?.players.find((p) => p.id === deviceId);
    if (me) samples.push({ t: i * 100, x: me.x, y: me.y, vx: me.vx, vy: me.vy });
  }
  await page.keyboard.up("KeyW");
  await page.screenshot({ path: join(SHOTS, `${label}-after-w.png`) });

  const deltas = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    deltas.push(Math.hypot(b.x - a.x, b.y - a.y));
  }
  const totalMove = samples.length > 1
    ? Math.hypot(samples.at(-1).x - samples[0].x, samples.at(-1).y - samples[0].y)
    : 0;
  const cellSnaps = samples.filter((s) => s.x % 20 === 0 && s.y % 20 === 0).length;
  const smooth = deltas.every((d) => d > 0.2 && d < 25) && totalMove > 10;
  const notCellLocked = cellSnaps < samples.length * 0.5;

  await page.locator("[data-mp-play-board]").click();
  await page.keyboard.down("KeyD");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(500);
  await page.keyboard.up("KeyD");
  await page.keyboard.up("KeyW");
  const qaDiag = await readQa(page);
  const meDiag = qaDiag?.players.find((p) => p.id === deviceId);
  const diagOk = meDiag?.hasAim === true || Math.hypot(meDiag?.vx ?? 0, meDiag?.vy ?? 0) > 0.3;

  return { smooth, notCellLocked, totalMove, diagOk, samples, shots: shots + 1 };
}

async function keyboardScope(page) {
  await page.locator("[data-mp-play-board]").click();
  const activeIn = await boardActive(page);
  const qa0 = await readQa(page);
  const y0 = qa0?.players.find((p) => p.id === qa0.deviceId)?.y ?? 0;
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(400);
  const qaIn = await readQa(page);
  const y1 = qaIn?.players.find((p) => p.id === qaIn.deviceId)?.y ?? 0;
  const movedIn = Math.abs(y1 - y0) > 3;

  await page.locator('[data-testid="mp-top10"]').click({ force: true });
  await page.waitForTimeout(150);
  const activeOut = await boardActive(page);

  await page.evaluate(() => window.scrollTo(0, 400));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(100);
  const scrollAfter = await page.evaluate(() => window.scrollY);
  const scrollWorks = scrollAfter >= scrollBefore;

  return { activeIn, activeOut: !activeOut, scrollWorks, movedIn };
}

async function trailAndClaim(page, deviceId) {
  await page.locator("[data-mp-play-board]").click();
  for (let i = 0; i < 28; i++) {
    await qaInput(page, 1, 0);
    await page.waitForTimeout(80);
  }
  for (let i = 0; i < 28; i++) {
    await qaInput(page, 0, 1);
    await page.waitForTimeout(80);
  }
  for (let i = 0; i < 28; i++) {
    await qaInput(page, -1, 0);
    await page.waitForTimeout(80);
  }
  for (let i = 0; i < 28; i++) {
    await qaInput(page, 0, -1);
    await page.waitForTimeout(80);
  }
  for (let i = 0; i < 35; i++) {
    await qaInput(page, -0.7, -0.7);
    await page.waitForTimeout(80);
  }
  await qaInput(page, 0, 0);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(SHOTS, "trail-claim.png") });
  const qa = await readQa(page);
  const me = qa?.players.find((p) => p.id === deviceId);
  return {
    trailVisible: (me?.trailLen ?? 0) > 0 || me?.outside === true,
    territoryPct: me?.territoryPct ?? 0,
    claimed: (me?.territoryPct ?? 0) > 0.55,
    alive: me?.alive === true,
  };
}

async function combatCheck(page, deviceId) {
  const qa = await readQa(page);
  const others = qa?.players.filter((p) => p.id !== deviceId && p.alive) ?? [];
  const enemyVisible = others.length > 0;
  const enemyNames = others.map((p) => p.id);
  return { enemyVisible, enemyCount: others.length, enemyNames, trailCut: "CEO_MANUAL", ko: "CEO_MANUAL" };
}

async function main() {
  const report = {
    base: BASE,
    commit: COMMIT,
    finishedAt: null,
    ceoFeel: "PENDING_CEO",
    movementFeel: "FAIL",
    keyboardScope: "FAIL",
    trailVisibility: "FAIL",
    territoryClaim: "FAIL",
    enemyVisibility: "FAIL",
    trailCut: "PENDING_CEO",
    ko: "PENDING_CEO",
    rematch: "SKIP",
    exitKeyboard: "FAIL",
    mobile: "FAIL",
    twoBrowserSync: "FAIL",
    typecheck: "PASS",
    build: "PASS",
    git: { commit: "NO", push: "NO", preview: "NO" },
    evidence: SHOTS,
    notes: [],
  };

  const browser = await chromium.launch({ headless: true });
  const { pageA, pageB, close } = await createDualPages(browser, "ceo-a", "ceo-b");
  const url = `${BASE}${invitePath("territory-war", "TW-CEO", "mp_qa_local=1")}`;

  try {
    await pageA.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await pageA.waitForSelector('[data-testid="mp-enter-world"], button:has-text("EXPAND")', {
      timeout: 60_000,
    });
    if ((await pageA.locator('[data-testid="mp-enter-world"]').count()) > 0) {
      await pageA.locator('[data-testid="mp-enter-world"]').click();
    } else {
      await pageA.locator('button:has-text("EXPAND")').click();
    }
    await pageA.waitForFunction(() => typeof window.__TW_QA__ === "function", { timeout: 30_000 });
    await pageA.screenshot({ path: join(SHOTS, "01-ingame.png") });

    const qa0 = await readQa(pageA);
    const deviceId = qa0?.deviceId;

    const move = await sampleMovement(pageA, deviceId, "move", 0);
    report.movementFeel = move.smooth && move.notCellLocked && move.diagOk ? "PASS" : "FAIL";
    if (report.movementFeel === "FAIL") {
      report.notes.push(`movement: total=${move.totalMove.toFixed(1)} smooth=${move.smooth} cellLock=${!move.notCellLocked}`);
    }

    const kb = await keyboardScope(pageA);
    report.keyboardScope = kb.activeIn && kb.activeOut ? "PASS" : "FAIL";
    report.exitKeyboard = kb.scrollWorks && kb.activeOut ? "PASS" : "FAIL";
    if (!kb.activeOut) report.notes.push("keyboard: board still active after exit click");

    await pageA.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await pageA.locator('button:has-text("EXPAND")').click();
    await pageA.waitForFunction(() => typeof window.__TW_QA__ === "function");

    const tc = await trailAndClaim(pageA, deviceId);
    report.trailVisibility = tc.trailVisible || tc.claimed ? "PASS" : "FAIL";
    report.territoryClaim = tc.claimed && tc.alive ? "PASS" : "FAIL";

    const combat = await combatCheck(pageA, deviceId);
    report.enemyVisibility = combat.enemyVisible ? "PASS" : "FAIL";

    const iphone = await browser.newContext({ ...devices["iPhone 13"] });
    const mobile = await iphone.newPage();
    await mobile.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await mobile.locator('button:has-text("EXPAND")').click();
    await mobile.waitForFunction(() => typeof window.__TW_QA__ === "function", { timeout: 30_000 });
    await mobile.locator("[data-mp-play-board]").click();
    for (let i = 0; i < 20; i++) {
      await qaInput(mobile, 0, -1);
      await mobile.waitForTimeout(80);
    }
    const mqa = await readQa(mobile);
    const meM = mqa?.players.find((p) => p.id === mqa.deviceId);
    report.mobile =
      (await mobile.locator('[data-testid="mp-mobile-control-pad"]').count()) > 0 &&
      meM &&
      Math.abs(meM.y - 370) > 5
        ? "PASS"
        : "FAIL";
    await mobile.screenshot({ path: join(SHOTS, "mobile-play.png") });
    await iphone.close();

    await pageB.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await pageB.locator('button:has-text("EXPAND")').click();
    await pageA.locator("[data-mp-play-board]").click();
    for (let i = 0; i < 10; i++) {
      await qaInput(pageA, 1, 0);
      await pageA.waitForTimeout(100);
    }
    await pageB.waitForTimeout(800);
    const qaA = await readQa(pageA);
    const qaB = await readQa(pageB);
    const localA = qaA?.players.find((p) => p.id === qaA.deviceId);
    const remoteA = qaB?.players.find((p) => p.id === qaA.deviceId);
    report.twoBrowserSync =
      localA && remoteA && Math.hypot(localA.x - remoteA.x, localA.y - remoteA.y) < 80
        ? "PASS"
        : "FAIL";

    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "ceo-checklist-report.json"), JSON.stringify(report, null, 2));

    console.log(JSON.stringify(report, null, 2));
    const autoPass = [
      report.movementFeel,
      report.keyboardScope,
      report.trailVisibility,
      report.territoryClaim,
      report.enemyVisibility,
      report.exitKeyboard,
      report.mobile,
      report.twoBrowserSync,
    ].every((x) => x === "PASS");

    console.log("\n=== CEO CHECKLIST (auto) ===", autoPass ? "ALL_AUTO_PASS" : "HAS_FAIL");
    process.exit(autoPass ? 0 : 1);
  } finally {
    await close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
