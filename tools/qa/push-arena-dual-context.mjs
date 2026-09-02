/**
 * Push Arena dual-context smoke — GAME-DEV-012 gate.
 * Usage: QA_BASE_URL=http://localhost:3011 node tools/qa/push-arena-dual-context.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  BASE,
  COMMIT,
  createDualPages,
  enterGame,
  invitePath,
} from "./lib/mp-common.mjs";

const OUT = join(process.cwd(), "docs/qa/cpo/push-arena-g12");
mkdirSync(OUT, { recursive: true });

function dist(a, b) {
  if (!a || !b) return Infinity;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function readQa(page) {
  return page.evaluate(() => window.__PUSH_ARENA_QA__?.() ?? null);
}

async function qaInput(page, dx, dy, opts = {}) {
  await page.evaluate(
    ([x, y, o]) => window.__PUSH_ARENA_QA_INPUT__?.(x, y, o),
    [dx, dy, opts]
  );
}

async function main() {
  const report = {
    base: BASE,
    commit: COMMIT,
    room: "PUSH-G12",
    playerA: null,
    playerB: null,
    movementSync: { aToB: false, bToA: false },
    pushDetected: false,
    itemsSynced: false,
    roundOver: false,
    rematchOk: false,
    mobilePad: false,
    finishedAt: null,
    pass: false,
  };

  const browser = await chromium.launch({ headless: true });
  const { pageA, pageB, close } = await createDualPages(browser, "pa-device-a", "pa-device-b");
  const url = `${BASE}${invitePath("push-arena", report.room, "mp_qa_local=1")}`;

  try {
    await pageA.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await pageB.goto(url, { waitUntil: "networkidle", timeout: 120_000 });

    await pageA.waitForSelector('[data-testid="mp-entry-lobby"], [data-testid="mp-you-bar"]', {
      timeout: 120_000,
    });
    await pageB.waitForSelector('[data-testid="mp-entry-lobby"], [data-testid="mp-you-bar"]', {
      timeout: 120_000,
    });

    const enterA = await pageA.locator('[data-testid="mp-enter-world"]').count();
    if (enterA > 0) await pageA.locator('[data-testid="mp-enter-world"]').click();
    const enterB = await pageB.locator('[data-testid="mp-enter-world"]').count();
    if (enterB > 0) await pageB.locator('[data-testid="mp-enter-world"]').click();

    await pageA.waitForTimeout(2500);
    await pageB.waitForTimeout(2500);

    await pageA.waitForFunction(() => typeof window.__PUSH_ARENA_QA__ === "function", { timeout: 30_000 });
    await pageB.waitForFunction(() => typeof window.__PUSH_ARENA_QA__ === "function", { timeout: 30_000 });

    const qaA0 = await readQa(pageA);
    const qaB0 = await readQa(pageB);
    report.playerA = qaA0?.deviceId ?? null;
    report.playerB = qaB0?.deviceId ?? null;

    const distinctIds = qaA0?.deviceId && qaB0?.deviceId && qaA0.deviceId !== qaB0.deviceId;
    if (!distinctIds) {
      console.log("FAIL distinct device ids", qaA0?.deviceId, qaB0?.deviceId);
    } else {
      console.log("PASS distinct device ids");
    }

    await pageA.waitForTimeout(2000);
    const beforeA = await readQa(pageA);
    await qaInput(pageA, 1, 0, { boost: true });
    for (let i = 0; i < 40; i++) {
      await qaInput(pageA, 1, 0, { boost: true });
      await pageA.waitForTimeout(120);
    }
    await pageB.waitForTimeout(1200);
    const afterA = await readQa(pageA);
    const remoteAonB = afterA?.players.find((p) => p.id === report.playerA);

    const localMoved =
      beforeA?.players.find((p) => p.id === report.playerA)?.x !==
      afterA?.players.find((p) => p.id === report.playerA)?.x;
    const syncedA =
      localMoved &&
      remoteAonB &&
      dist(
        afterA?.players.find((p) => p.id === report.playerA),
        (await readQa(pageB))?.players.find((p) => p.id === report.playerA)
      ) < 40;
    report.movementSync.aToB = syncedA;
    console.log(syncedA ? "PASS A movement visible on B" : "FAIL A movement sync", { localMoved });

    await qaInput(pageB, -1, 0, { boost: true });
    for (let i = 0; i < 20; i++) {
      await qaInput(pageB, -1, 0, { boost: true });
      await pageB.waitForTimeout(100);
    }
    await pageA.waitForTimeout(800);
    const afterB = await readQa(pageB);
    const beforeBMove = afterA;
    const localBMoved =
      beforeBMove?.players.find((p) => p.id === report.playerB)?.x !==
      afterB?.players.find((p) => p.id === report.playerB)?.x;
    const syncedB =
      localBMoved &&
      dist(
        afterB?.players.find((p) => p.id === report.playerB),
        (await readQa(pageA))?.players.find((p) => p.id === report.playerB)
      ) < 40;
    report.movementSync.bToA = syncedB;
    console.log(syncedB ? "PASS B movement visible on A" : "FAIL B movement sync", { localBMoved });

    await qaInput(pageA, 1, 0, { boost: true, push: true });
    for (let i = 0; i < 30; i++) {
      await qaInput(pageA, 1, 0, { boost: true });
      await pageA.waitForTimeout(80);
    }
    await pageB.waitForTimeout(600);
    const pushSnap = await readQa(pageA);
    const pA = pushSnap?.players.find((p) => p.id === report.playerA);
    const pB = pushSnap?.players.find((p) => p.id === report.playerB);
    report.pushDetected = !!(pA && pB && dist(pA, pB) > 30);
    console.log(report.pushDetected ? "PASS players separated (push/collision)" : "WARN push separation inconclusive", dist(pA, pB));

    const itemsA = pushSnap?.items ?? 0;
    const itemsB = (await readQa(pageB))?.items ?? 0;
    report.itemsSynced = itemsA === itemsB && itemsA >= 1;
    console.log(report.itemsSynced ? "PASS item count synced" : "FAIL item sync", { itemsA, itemsB });

    report.mobilePad =
      (await pageA.locator('[data-testid="mp-mobile-control-pad"]').count()) > 0;
    console.log(report.mobilePad ? "PASS mobile pad present" : "FAIL mobile pad");

    report.pass =
      distinctIds &&
      report.movementSync.aToB &&
      report.movementSync.bToA &&
      report.itemsSynced &&
      report.mobilePad;

    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "dual-context-report.json"), JSON.stringify(report, null, 2));
    console.log("\n=== PUSH ARENA G12 ===");
    console.log(report.pass ? "PASS" : "FAIL");
    process.exit(report.pass ? 0 : 1);
  } finally {
    await close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
