/**
 * Territory War dual-context — GAME-DEV-012R gate.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { BASE, COMMIT, createDualPages, invitePath } from "./lib/mp-common.mjs";

const OUT = join(process.cwd(), "docs/qa/cpo/territory-war-g12r");
mkdirSync(OUT, { recursive: true });

async function readQa(page) {
  return page.evaluate(() => window.__TW_QA__?.() ?? null);
}

async function qaInput(page, dx, dy, opts = {}) {
  await page.evaluate(([x, y, o]) => window.__TW_QA_INPUT__?.(x, y, o), [dx, dy, opts]);
}

async function expandLoop(page, deviceId, rounds = 1) {
  const legs = [
    [1, 0, 30],
    [0, 1, 30],
    [-1, 0, 30],
    [0, -1, 30],
  ];
  for (let r = 0; r < rounds; r++) {
    for (const [dx, dy, n] of legs) {
      for (let i = 0; i < n; i++) {
        await qaInput(page, dx, dy);
        await page.waitForTimeout(80);
      }
    }
  }
  for (let i = 0; i < 40; i++) {
    await qaInput(page, -0.7, -0.7);
    await page.waitForTimeout(80);
  }
  await qaInput(page, 0, 0);
  await page.waitForTimeout(500);
  const qa = await readQa(page);
  return qa?.players.find((p) => p.id === deviceId);
}

async function main() {
  const report = {
    base: BASE,
    commit: COMMIT,
    room: "TW-G12R",
    playerA: null,
    playerB: null,
    movementSync: false,
    territoryExpanded: false,
    trailCreated: false,
    playerAliveAfterExpand: false,
    territorySynced: false,
    mobilePad: false,
    pass: false,
    finishedAt: null,
  };

  const browser = await chromium.launch({ headless: true });
  const { pageA, pageB, close } = await createDualPages(browser, "tw-a", "tw-b");
  const url = `${BASE}${invitePath("territory-war", report.room, "mp_qa_local=1")}`;

  try {
    await pageA.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await pageB.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await pageA.waitForSelector('[data-testid="mp-enter-world"], [data-testid="mp-you-bar"]', {
      timeout: 120_000,
    });
    await pageB.waitForSelector('[data-testid="mp-enter-world"], [data-testid="mp-you-bar"]', {
      timeout: 120_000,
    });

    if ((await pageA.locator('[data-testid="mp-enter-world"]').count()) > 0) {
      await pageA.locator('[data-testid="mp-enter-world"]').click();
    }
    if ((await pageB.locator('[data-testid="mp-enter-world"]').count()) > 0) {
      await pageB.locator('[data-testid="mp-enter-world"]').click();
    }
    await pageA.waitForTimeout(3000);
    await pageB.waitForTimeout(3000);

    await pageA.waitForFunction(() => typeof window.__TW_QA__ === "function", { timeout: 30_000 });
    await pageB.waitForFunction(() => typeof window.__TW_QA__ === "function", { timeout: 30_000 });

    await pageA.locator("[data-mp-play-board]").click();
    await pageB.locator("[data-mp-play-board]").click();

    const qaA0 = await readQa(pageA);
    const qaB0 = await readQa(pageB);
    report.playerA = qaA0?.deviceId ?? null;
    report.playerB = qaB0?.deviceId ?? null;

    const distinct = qaA0?.deviceId && qaB0?.deviceId && qaA0.deviceId !== qaB0.deviceId;
    const pctA0 = qaA0?.players.find((p) => p.id === report.playerA)?.territoryPct ?? 0;

    // Expand first on a clean state — pre-moving for sync left a trail that self-KO'd the square loop.
    const playerAfterExpand = await expandLoop(pageA, report.playerA, 1);
    await pageB.waitForTimeout(1200);
    const qaB2 = await readQa(pageB);
    const remoteAfter = qaB2?.players.find((p) => p.id === report.playerA);

    report.playerAliveAfterExpand = playerAfterExpand?.alive === true;
    report.territoryExpanded =
      playerAfterExpand?.alive === true &&
      (playerAfterExpand?.territoryPct ?? pctA0) > pctA0 + 0.3;
    report.territorySynced =
      !!remoteAfter &&
      Math.abs((remoteAfter.territoryPct ?? 0) - (playerAfterExpand?.territoryPct ?? 0)) < 2;
    report.trailCreated =
      report.territoryExpanded ||
      (playerAfterExpand?.trailLen ?? 0) > 0 ||
      (remoteAfter?.trailLen ?? 0) > 0;

    await qaInput(pageA, 1, 0);
    for (let i = 0; i < 15; i++) {
      await qaInput(pageA, 1, 0);
      await pageA.waitForTimeout(100);
    }
    await pageB.waitForTimeout(800);
    const qaA1 = await readQa(pageA);
    const qaB1 = await readQa(pageB);
    const remoteA = qaB1?.players.find((p) => p.id === report.playerA);
    const localA = qaA1?.players.find((p) => p.id === report.playerA);
    report.movementSync =
      !!localA &&
      !!remoteA &&
      Math.hypot(localA.x - remoteA.x, localA.y - remoteA.y) < 80;

    report.mobilePad = (await pageA.locator('[data-testid="mp-mobile-control-pad"]').count()) > 0;

    report.pass =
      distinct &&
      report.movementSync &&
      report.playerAliveAfterExpand &&
      report.territoryExpanded &&
      report.trailCreated &&
      report.territorySynced &&
      report.mobilePad;

    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "dual-context-report.json"), JSON.stringify(report, null, 2));

    console.log("distinct", distinct);
    console.log("movementSync", report.movementSync);
    console.log("territoryExpanded", report.territoryExpanded, pctA0, "->", playerAfterExpand?.territoryPct, "alive", playerAfterExpand?.alive);
    console.log("territorySynced", report.territorySynced);
    console.log("trailCreated", report.trailCreated);
    console.log("mobilePad", report.mobilePad);
    console.log("\n=== TERRITORY WAR G12R ===", report.pass ? "PASS" : "FAIL");
    process.exit(report.pass ? 0 : 1);
  } finally {
    await close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
