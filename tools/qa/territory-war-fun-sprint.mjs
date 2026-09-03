/**
 * GAME-DEV-014 — Territory War Productization E2E (Scenarios A–E).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices } from "playwright";
import { BASE, COMMIT, createDualPages, invitePath } from "./lib/mp-common.mjs";

const OUT = join(process.cwd(), "docs/qa/cpo/territory-war-g12r");
const SHOTS = join(OUT, "fun-sprint");
mkdirSync(SHOTS, { recursive: true });

async function readQa(page) {
  return page.evaluate(() => window.__TW_QA__?.() ?? null);
}

async function qaInput(page, dx, dy) {
  await page.evaluate(([x, y]) => window.__TW_QA_INPUT__?.(x, y), [dx, dy]);
}

async function enterGame(page) {
  const room = `TW-FUN-${Date.now()}`;
  const url = `${BASE}${invitePath("territory-war", room, "mp_qa_local=1")}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector('button:has-text("EXPAND"), [data-testid="mp-enter-world"]', {
    timeout: 60_000,
  });
  if ((await page.locator('[data-testid="mp-enter-world"]').count()) > 0) {
    await page.locator('[data-testid="mp-enter-world"]').click();
  } else {
    await page.locator('button:has-text("EXPAND")').click();
  }
  await page.waitForFunction(() => typeof window.__TW_QA__ === "function", { timeout: 30_000 });
  await page.locator("[data-mp-play-board]").click();
}

async function scenarioExpansion(page, deviceId) {
  const qa0 = await readQa(page);
  const pct0 = qa0?.players.find((p) => p.id === deviceId)?.territoryPct ?? 0;
  const legs = [
    [1, 0, 30],
    [0, 1, 30],
    [-1, 0, 30],
    [0, -1, 30],
  ];
  for (const [dx, dy, n] of legs) {
    for (let i = 0; i < n; i++) {
      await qaInput(page, dx, dy);
      await page.waitForTimeout(80);
    }
  }
  for (let i = 0; i < 40; i++) {
    await qaInput(page, -0.7, -0.7);
    await page.waitForTimeout(80);
  }
  await qaInput(page, 0, 0);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SHOTS, "A-expansion.png") });
  const qa = await readQa(page);
  const me = qa?.players.find((p) => p.id === deviceId);
  return {
    pass: (me?.territoryPct ?? 0) > pct0 + 0.3 && me?.alive === true,
    pct0,
    pct1: me?.territoryPct ?? 0,
    trailLen: me?.trailLen ?? 0,
  };
}

async function scenarioCombat(page, deviceId) {
  const qaStart = await readQa(page);
  const ko0 = qaStart?.players.find((p) => p.id === deviceId)?.knockouts ?? 0;
  let maxTrail = 0;
  for (let i = 0; i < 160; i++) {
    const ang = (i / 18) * Math.PI * 2;
    await qaInput(page, Math.cos(ang), Math.sin(ang));
    await page.waitForTimeout(75);
    if (i % 10 === 9) {
      const qa = await readQa(page);
      const me = qa?.players.find((p) => p.id === deviceId);
      maxTrail = Math.max(maxTrail, me?.trailLen ?? 0);
      if (me?.alive === false) break;
    }
  }
  await qaInput(page, 0, 0);
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(100);
    const qa = await readQa(page);
    const me = qa?.players.find((p) => p.id === deviceId);
    maxTrail = Math.max(maxTrail, me?.trailLen ?? 0);
    if (me?.alive === false) break;
  }
  await page.screenshot({ path: join(SHOTS, "B-combat.png") });
  const qa = await readQa(page);
  const me = qa?.players.find((p) => p.id === deviceId);
  const died = me?.alive === false;
  const hadTrail = maxTrail > 4;
  const deathOverlay = (await page.locator('[data-testid="mp-death-overlay"]').count()) > 0;
  const ko1 = me?.knockouts ?? 0;
  const gotKill = ko1 > ko0;
  return { pass: hadTrail && (died || deathOverlay || gotKill), died, hadTrail, maxTrail, deathOverlay, gotKill };
}

async function scenarioRematch(page) {
  const deathOverlay = await page.locator('[data-testid="mp-death-overlay"]').count();
  if (deathOverlay > 0) {
    await page.locator('[data-testid="mp-death-retry"]').click();
  } else {
    return { pass: false, note: "player still alive — combat KO required first" };
  }
  await page.waitForTimeout(2500);
  await page.locator("[data-mp-play-board]").click();
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(500);
  await page.keyboard.up("KeyW");
  const qa = await readQa(page);
  const me = qa?.players.find((p) => p.id === qa.deviceId);
  await page.screenshot({ path: join(SHOTS, "C-rematch.png") });
  return { pass: me?.alive === true, y: me?.y };
}

async function scenarioExit(page) {
  await page.locator('button:has-text("나가기")').click();
  await page.waitForTimeout(800);
  const active = await page.evaluate(
    () => document.querySelector('[data-mp-play-board][data-mp-board-input="active"]') != null
  );
  await page.screenshot({ path: join(SHOTS, "D-exit.png") });
  return { pass: !active && page.url().includes("/") };
}

async function main() {
  const report = {
    base: BASE,
    commit: COMMIT,
    sprint: "GAME-DEV-014",
    finishedAt: null,
    scenarios: {},
    product: { purpose30s: null, enemyTension: null, rematchDesire: null },
    git: { commit: "NO", push: "NO", preview: "NO" },
  };

  const browser = await chromium.launch({ headless: true });

  try {
    const solo = await browser.newContext();
    const page = await solo.newPage();
    await enterGame(page);
    const qa0 = await readQa(page);
    const deviceId = qa0.deviceId;

    report.scenarios.A_expansion = await scenarioExpansion(page, deviceId);
    report.scenarios.B_combat = await scenarioCombat(page, deviceId);
    report.scenarios.C_rematch = await scenarioRematch(page);
    report.scenarios.D_exit = await scenarioExit(page);

    const { pageA, pageB, close } = await createDualPages(browser, "fun-a", "fun-b");
    const url = `${BASE}${invitePath("territory-war", `TW-FUN2-${Date.now()}`, "mp_qa_local=1")}`;
    await pageA.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await pageB.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await pageA.locator('button:has-text("EXPAND")').click();
    await pageB.locator('button:has-text("EXPAND")').click();
    await pageA.waitForFunction(() => typeof window.__TW_QA__ === "function");
    await pageB.waitForFunction(() => typeof window.__TW_QA__ === "function");
    await pageA.locator("[data-mp-play-board]").click();
    await pageB.locator("[data-mp-play-board]").click();
    await pageA.waitForTimeout(500);
    for (let i = 0; i < 20; i++) {
      await qaInput(pageA, 1, 0);
      await pageA.waitForTimeout(100);
    }
    await pageB.waitForTimeout(2000);
    const qaA = await readQa(pageA);
    const qaB = await readQa(pageB);
    const localA = qaA?.players.find((p) => p.id === qaA.deviceId);
    const remoteA = qaB?.players.find((p) => p.id === qaA.deviceId);
    report.scenarios.E_twoBrowser = {
      pass: !!localA && !!remoteA && Math.hypot(localA.x - remoteA.x, localA.y - remoteA.y) < 100,
    };

    const iphone = await browser.newContext({ ...devices["iPhone 13"] });
    const mobile = await iphone.newPage();
    await enterGame(mobile);
    for (let i = 0; i < 30; i++) {
      await qaInput(mobile, 0, -1);
      await mobile.waitForTimeout(80);
    }
    const mqa = await readQa(mobile);
    const meM = mqa?.players.find((p) => p.id === mqa.deviceId);
    report.scenarios.mobile = {
      pass:
        (await mobile.locator('[data-testid="mp-mobile-control-pad"]').count()) > 0 &&
        meM &&
        Math.abs(meM.y - 370) > 4,
    };
    await mobile.screenshot({ path: join(SHOTS, "E-mobile.png") });

    report.product.purpose30s = report.scenarios.A_expansion.pass ? "LIKELY" : "FAIL";
    report.product.enemyTension = report.scenarios.B_combat.pass ? "LIKELY" : "WEAK";
    report.product.rematchDesire = report.scenarios.C_rematch.pass ? "LIKELY" : "FAIL";

    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "fun-sprint-report.json"), JSON.stringify(report, null, 2));

    const allPass = Object.values(report.scenarios).every((s) => s.pass);
    console.log(JSON.stringify(report, null, 2));
    console.log("\n=== GAME-DEV-014 PRODUCTIZATION ===", allPass ? "PASS" : "FAIL");
    await close();
    await solo.close();
    await iphone.close();
    process.exit(allPass ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
