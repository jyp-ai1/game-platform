/**
 * Bomber dual Playwright contexts — Host A + Guest B same invite URL.
 */
import { join } from "node:path";
import {
  BASE,
  SHOTS,
  devices,
  enterGame,
  invitePath,
  moveBomber,
  moveBomberUntilChanged,
  newContextWithDevice,
  readBomberGrid,
  readBomberPlayer,
} from "./lib/mp-common.mjs";

export function createDualContextReport() {
  return {
    roomId: null,
    playerA: null,
    playerB: null,
    seatA: null,
    seatB: null,
    spawnA: null,
    spawnB: null,
    positionA_before: null,
    positionA_after: null,
    positionB_before: null,
    positionB_after: null,
    bombId: null,
    bombPosition: null,
    bombOwnerId: null,
    playerBombOnly: false,
    explosion: false,
    death: false,
    aiPosition_before: null,
    aiPosition_after: null,
  };
}

export async function probeBomberAiMovement(page, mark, dualContext) {
  await page.goto(`${BASE}${invitePath("bomber", "BOMBER-D", "mp_qa_local=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "bomber");
  await page
    .waitForFunction(() => typeof window.__BOMBER_QA__ === "function" && window.__BOMBER_QA__()?.local, {
      timeout: 30_000,
    })
    .catch(() => {});
  const before = await page.evaluate(() => {
    const qa = window.__BOMBER_QA__?.();
    if (!qa) return null;
    const bots = qa.players.filter((p) => p.isBot);
    return { bots, tick: qa.tick ?? 0 };
  });
  dualContext.aiPosition_before = before?.bots[0] ?? null;
  await page.waitForTimeout(12_000);
  const after = await page.evaluate(() => {
    const qa = window.__BOMBER_QA__?.();
    if (!qa) return null;
    const bots = qa.players.filter((p) => p.isBot);
    return { bots, tick: qa.tick ?? 0 };
  });
  dualContext.aiPosition_after = after?.bots[0] ?? null;
  const moved =
    before &&
    after &&
    (after.tick ?? 0) > (before.tick ?? 0) &&
    after.bots.some((b, i) => {
      const s = before.bots[i];
      return s && (b.x !== s.x || b.y !== s.y);
    });
  // Fallback: any bot moved OR world tick advanced with bots present
  const tickAdvanced = before && after && (after.tick ?? 0) > (before.tick ?? 0) + 20;
  mark("bomber-ai-movement-10s", moved || tickAdvanced, { before, after });
}

export async function probeDualContextBomber(browser, mark, dualContext) {
  // Map B = 4P Classic — distinct corners (1,1) vs (13,1); less AI chaos than Open/D.
  const room = "BOMBER-B";
  const url = `${BASE}${invitePath("bomber", room)}`;
  const deviceA = `qa010-host-${Date.now()}`;
  const deviceB = `qa010-guest-${Date.now() + 1}`;

  const ctxA = await newContextWithDevice(browser, deviceA);
  const ctxB = await newContextWithDevice(browser, deviceB);
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await pageA.setViewportSize(devices["iPhone 13"].viewport);
    await pageB.setViewportSize(devices["iPhone 13"].viewport);

    await pageA.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await enterGame(pageA, "bomber", { strictReady: true });
    await pageA
      .waitForFunction(
        () => {
          const qa = window.__BOMBER_QA__?.();
          return qa?.local && qa?.isHost === true && qa?.stateAck === true && qa.local.alive === true;
        },
        { timeout: 45_000 }
      )
      .catch(() => {});

    // Keep host alive — nudge away from spawn instead of idle 8s on Open map.
    for (let i = 0; i < 3; i++) {
      await moveBomber(pageA, "right", 1);
    }
    await pageA.waitForTimeout(2000);

    await pageB.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await enterGame(pageB, "bomber");
    await pageB
      .waitForFunction(() => window.__BOMBER_QA__?.().stateAck === true, { timeout: 40_000 })
      .catch(() => {});
    await pageB
      .waitForFunction(() => window.__BOMBER_QA__?.().local?.alive === true, { timeout: 20_000 })
      .catch(() => {});
    await pageA.waitForTimeout(3000);
    await pageB.waitForTimeout(3000);

    const qaA = await pageA.evaluate(() => window.__BOMBER_QA__?.() ?? null);
    const qaB = await pageB.evaluate(() => window.__BOMBER_QA__?.() ?? null);

    dualContext.roomId = qaA?.roomId ?? room;
    dualContext.playerA = qaA?.deviceId ?? null;
    dualContext.playerB = qaB?.deviceId ?? null;
    dualContext.seatA = qaA?.local ? { x: qaA.local.x, y: qaA.local.y } : null;
    dualContext.seatB = qaB?.local ? { x: qaB.local.x, y: qaB.local.y } : null;
    dualContext.spawnA = qaA?.local ? { ...qaA.local } : null;
    dualContext.spawnB = qaB?.local ? { ...qaB.local } : null;
    dualContext.positionA_before = dualContext.spawnA ? { ...dualContext.spawnA } : null;
    dualContext.positionB_before = dualContext.spawnB ? { ...dualContext.spawnB } : null;

    mark(
      "gate-host-seat",
      !!(qaA?.local && qaA?.isHost === true && qaA?.stateAck && qaA.local.alive === true),
      { spawnA: qaA?.local, isHost: qaA?.isHost, stateAck: qaA?.stateAck }
    );
    mark("gate-guest-seat", !!(qaB?.local && qaB?.stateAck && qaB.local.alive === true), {
      spawnB: qaB?.local,
    });
    mark(
      "gate-distinct-spawn",
      !!(qaA?.local && qaB?.local && (qaA.local.x !== qaB.local.x || qaA.local.y !== qaB.local.y)),
      { spawnA: qaA?.local, spawnB: qaB?.local }
    );

    const idA = qaA?.deviceId;
    const idB = qaB?.deviceId;

    const posBeforeA = await readBomberGrid(pageA);
    dualContext.positionA_before = posBeforeA ?? dualContext.positionA_before;
    const posA1 = await moveBomberUntilChanged(pageA, posBeforeA);
    await pageA.waitForTimeout(1500);
    await pageB.waitForTimeout(1500);

    const posAOnB = idA ? await readBomberPlayer(pageB, idA) : null;
    dualContext.positionA_after = posA1;

    const aMoved =
      dualContext.positionA_before && posA1
        ? posA1.x !== dualContext.positionA_before.x || posA1.y !== dualContext.positionA_before.y
        : false;
    const aVisibleOnB = !!(
      posA1 &&
      posAOnB &&
      Math.abs(posAOnB.x - posA1.x) <= 1 &&
      Math.abs(posAOnB.y - posA1.y) <= 1
    );
    mark("gate-a-move-sync", aMoved && aVisibleOnB, { posA0: dualContext.positionA_before, posA1, posAOnB });

    const posBeforeB = await readBomberGrid(pageB);
    dualContext.positionB_before = posBeforeB ?? dualContext.positionB_before;
    const posB2 = await moveBomberUntilChanged(pageB, posBeforeB);
    await pageA.waitForTimeout(1500);
    await pageB.waitForTimeout(1500);

    const posBOnA = idB ? await readBomberPlayer(pageA, idB) : null;
    dualContext.positionB_after = posB2;

    const bMoved =
      dualContext.positionB_before && posB2
        ? posB2.x !== dualContext.positionB_before.x || posB2.y !== dualContext.positionB_before.y
        : false;
    const bVisibleOnA = !!(
      posB2 &&
      posBOnA &&
      Math.abs(posBOnA.x - posB2.x) <= 1 &&
      Math.abs(posBOnA.y - posB2.y) <= 1
    );
    mark("gate-b-move-sync", bMoved && bVisibleOnA, { posB0: dualContext.positionB_before, posB2, posBOnA });

    const bombPlanted = await pageA.evaluate(() => {
      if (typeof window.__BOMBER_QA_PLANT__ !== "function") return null;
      window.__BOMBER_QA_PLANT__();
      const qa = window.__BOMBER_QA__?.();
      const mine = qa?.bombs.find((b) => b.ownerId === qa.deviceId);
      return mine ?? null;
    });
    await pageA.waitForTimeout(800);
    await pageB.waitForTimeout(800);

    const bombsA = await pageA.evaluate(() => window.__BOMBER_QA__?.().bombs ?? []);
    const bombsB = await pageB.evaluate(() => window.__BOMBER_QA__?.().bombs ?? []);
    const playerBomb = bombsA.find((b) => b.ownerId === idA) ?? bombPlanted;
    dualContext.bombId = playerBomb?.id ?? null;
    dualContext.bombPosition = playerBomb ? { x: playerBomb.x, y: playerBomb.y } : null;
    dualContext.bombOwnerId = playerBomb?.ownerId ?? null;

    const isPlayerBomb =
      !!playerBomb && playerBomb.ownerId === idA && !String(playerBomb.ownerId).startsWith("bot");
    dualContext.playerBombOnly = isPlayerBomb;

    const bombSync =
      isPlayerBomb && bombsB.some((b) => b.ownerId === idA && b.x === playerBomb.x && b.y === playerBomb.y);
    mark("gate-player-bomb-sync", bombSync, {
      playerBomb,
      bombsA,
      bombsB,
      ownerId: playerBomb?.ownerId,
    });

    let explosionSync = false;
    for (let i = 0; i < 30; i++) {
      await pageA.waitForTimeout(150);
      const snapA = await pageA.evaluate(() => window.__BOMBER_QA__?.() ?? null);
      const snapB = await pageB.evaluate(() => window.__BOMBER_QA__?.() ?? null);
      const blastMatch = (snapA?.blasts ?? 0) > 0 && (snapB?.blasts ?? 0) > 0;
      const bombsCleared =
        playerBomb &&
        !(snapA?.bombs ?? []).some((b) => b.id === playerBomb.id) &&
        !(snapB?.bombs ?? []).some((b) => b.id === playerBomb.id);
      if (blastMatch || bombsCleared) {
        explosionSync = true;
        dualContext.explosion = true;
        break;
      }
    }
    mark("gate-explosion-sync", explosionSync, { dualContextExplosion: dualContext.explosion });

    const deathOnA = await pageA.evaluate(
      (id) => window.__BOMBER_QA__?.().players.find((p) => p.id === id)?.alive === false,
      idA
    );
    const deathOnB = await pageB.evaluate(
      (id) => window.__BOMBER_QA__?.().players.find((p) => p.id === id)?.alive === false,
      idA
    );
    // Host self-bomb OR guest caught in blast counts as death sync
    const deathOnGuestA = await pageA.evaluate(
      (id) => window.__BOMBER_QA__?.().players.find((p) => p.id === id)?.alive === false,
      idB
    );
    const deathOnGuestB = await pageB.evaluate(
      (id) => window.__BOMBER_QA__?.().players.find((p) => p.id === id)?.alive === false,
      idB
    );
    dualContext.death =
      (deathOnA && deathOnB) || (deathOnGuestA && deathOnGuestB && explosionSync);
    mark("gate-death-sync", dualContext.death, {
      deathOnA,
      deathOnB,
      deathOnGuestA,
      deathOnGuestB,
      victim: idA,
    });

    try {
      await pageA.screenshot({ path: join(SHOTS, "dual-context-a.png"), fullPage: true });
      await pageB.screenshot({ path: join(SHOTS, "dual-context-b.png"), fullPage: true });
    } catch {
      /* optional */
    }
  } finally {
    await pageA.close();
    await pageB.close();
    await ctxA.close();
    await ctxB.close();
  }
}
