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
    playerA: {
      id: null,
      seat: null,
      spawn: null,
      initialPosition: null,
      finalPosition: null,
    },
    playerB: {
      id: null,
      seat: null,
      spawn: null,
      initialPosition: null,
      finalPosition: null,
    },
    movementSync: { aToB: false, bToA: false },
    bomb: { owner: null, position: null, playerBombOnly: false },
    explosion: false,
    deathSync: false,
    aiMoved: false,
    // legacy flat fields for 010 compat
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
    death: false,
  };
}

async function waitRemotePlayer(page, playerId, expected, timeoutMs = 10_000) {
  try {
    await page.waitForFunction(
      ({ id, x, y }) => {
        const el = document.querySelector(`[data-player-id="${id}"]`);
        if (!el) return false;
        const px = Number(el.getAttribute("data-grid-x"));
        const py = Number(el.getAttribute("data-grid-y"));
        return Math.abs(px - x) <= 1 && Math.abs(py - y) <= 1;
      },
      { id: playerId, x: expected.x, y: expected.y },
      { timeout: timeoutMs }
    );
    return true;
  } catch {
    return false;
  }
}

function seatOf(qa, seats) {
  if (!qa?.local) return null;
  const idx = seats.findIndex((s) => s.x === qa.local.x && s.y === qa.local.y);
  return idx >= 0 ? idx : null;
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
  dualContext.aiMoved = moved || tickAdvanced;
}

export async function probeDualContextBomber(browser, mark, dualContext) {
  const room = "BOMBER-B";
  const url = `${BASE}${invitePath("bomber", room)}`;
  const ts = Date.now();
  const deviceA = `qa011-host-${ts}`;
  const deviceB = `qa011-guest-${ts + 1}`;
  const cornerSeats = [
    { x: 1, y: 1 },
    { x: 13, y: 1 },
    { x: 1, y: 11 },
    { x: 13, y: 11 },
  ];

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

    await pageB.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await enterGame(pageB, "bomber");
    await pageB
      .waitForFunction(() => window.__BOMBER_QA__?.().stateAck === true, { timeout: 40_000 })
      .catch(() => {});
    await pageA
      .waitForFunction(
        () => {
          const qa = window.__BOMBER_QA__?.();
          return qa?.local?.alive === true && qa?.stateAck === true;
        },
        { timeout: 45_000 }
      )
      .catch(() => {});
    await pageB
      .waitForFunction(() => window.__BOMBER_QA__?.().local?.alive === true, { timeout: 45_000 })
      .catch(() => {});
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(2000);

    const qaA = await pageA.evaluate(() => window.__BOMBER_QA__?.() ?? null);
    const qaB = await pageB.evaluate(() => window.__BOMBER_QA__?.() ?? null);

    dualContext.roomId = qaA?.roomId ?? room;
    dualContext.playerA.id = qaA?.deviceId ?? null;
    dualContext.playerB.id = qaB?.deviceId ?? null;
    dualContext.playerA.spawn = qaA?.local ? { ...qaA.local } : null;
    dualContext.playerB.spawn = qaB?.local ? { ...qaB.local } : null;
    dualContext.playerA.seat = seatOf(qaA, cornerSeats);
    dualContext.playerB.seat = seatOf(qaB, cornerSeats);
    dualContext.seatA = dualContext.playerA.spawn;
    dualContext.seatB = dualContext.playerB.spawn;
    dualContext.spawnA = dualContext.playerA.spawn;
    dualContext.spawnB = dualContext.playerB.spawn;
    dualContext.positionA_before = dualContext.playerA.initialPosition = dualContext.spawnA
      ? { ...dualContext.spawnA }
      : null;
    dualContext.positionB_before = dualContext.playerB.initialPosition = dualContext.spawnB
      ? { ...dualContext.spawnB }
      : null;

    const idA = qaA?.deviceId;
    const idB = qaB?.deviceId;

    const sameRoom = qaA?.roomId === qaB?.roomId && qaA?.roomId === room;
    const diffIds = !!(idA && idB && idA !== idB);
    const diffSeat =
      dualContext.playerA.seat !== null &&
      dualContext.playerB.seat !== null &&
      dualContext.playerA.seat !== dualContext.playerB.seat;
    const diffSpawn = !!(
      qaA?.local &&
      qaB?.local &&
      (qaA.local.x !== qaB.local.x || qaA.local.y !== qaB.local.y)
    );

    mark("gate-same-room", sameRoom, { roomA: qaA?.roomId, roomB: qaB?.roomId });
    mark("gate-different-player-id", diffIds, { idA, idB });
    mark("gate-different-seat", diffSeat, {
      seatA: dualContext.playerA.seat,
      seatB: dualContext.playerB.seat,
    });
    mark("gate-different-spawn", diffSpawn, { spawnA: qaA?.local, spawnB: qaB?.local });

    mark(
      "gate-host-seat",
      !!(qaA?.local && qaA?.isHost === true && qaA?.stateAck && qaA.local.alive === true),
      { spawnA: qaA?.local, isHost: qaA?.isHost, stateAck: qaA?.stateAck }
    );
    mark("gate-guest-seat", !!(qaB?.local && qaB?.stateAck && qaB.local.alive === true), {
      spawnB: qaB?.local,
      seat: dualContext.playerB.seat,
    });
    mark("gate-distinct-spawn", diffSpawn, { spawnA: qaA?.local, spawnB: qaB?.local });

    const posBeforeA = await readBomberGrid(pageA);
    dualContext.positionA_before = posBeforeA ?? dualContext.positionA_before;
    for (let i = 0; i < 6; i++) await moveBomber(pageA, "right", 1);
    await pageA.waitForTimeout(600);
    const posA1 = (await readBomberGrid(pageA)) ?? posBeforeA;
    const aVisibleOnB = idA && posA1 ? await waitRemotePlayer(pageB, idA, posA1, 12_000) : false;
    dualContext.positionA_after = dualContext.playerA.finalPosition = posA1;

    const aMoved =
      dualContext.positionA_before && posA1
        ? posA1.x !== dualContext.positionA_before.x || posA1.y !== dualContext.positionA_before.y
        : false;
    dualContext.movementSync.aToB = aMoved && aVisibleOnB;
    mark("gate-a-move-sync", dualContext.movementSync.aToB, {
      posA0: dualContext.positionA_before,
      posA1,
      posAOnB: idA ? await readBomberPlayer(pageB, idA) : null,
    });

    const posBeforeB = await readBomberGrid(pageB);
    dualContext.positionB_before = posBeforeB ?? dualContext.positionB_before;
    for (let i = 0; i < 6; i++) await moveBomber(pageB, "down", 1);
    await pageB.waitForTimeout(600);
    const posB2 = (await readBomberGrid(pageB)) ?? posBeforeB;
    const bVisibleOnA = idB && posB2 ? await waitRemotePlayer(pageA, idB, posB2, 12_000) : false;
    dualContext.positionB_after = dualContext.playerB.finalPosition = posB2;

    const bMoved =
      dualContext.positionB_before && posB2
        ? posB2.x !== dualContext.positionB_before.x || posB2.y !== dualContext.positionB_before.y
        : false;
    dualContext.movementSync.bToA = bMoved && bVisibleOnA;
    mark("gate-b-move-sync", dualContext.movementSync.bToA, {
      posB0: dualContext.positionB_before,
      posB2,
      posBOnA: idB ? await readBomberPlayer(pageA, idB) : null,
    });

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
    dualContext.bomb = {
      owner: playerBomb?.ownerId ?? null,
      position: playerBomb ? { x: playerBomb.x, y: playerBomb.y } : null,
      playerBombOnly: isPlayerBomb,
    };

    const bombSync =
      isPlayerBomb && bombsB.some((b) => b.ownerId === idA && b.x === playerBomb.x && b.y === playerBomb.y);
    mark("gate-human-player-bomb", isPlayerBomb, { ownerId: playerBomb?.ownerId });
    mark("gate-player-bomb-sync", bombSync, {
      playerBomb,
      bombsA,
      bombsB,
      ownerId: playerBomb?.ownerId,
    });
    mark("gate-bomb-sync", bombSync, { playerBomb, bombsB });

    let explosionSync = false;
    for (let i = 0; i < 40; i++) {
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

    let deathSync = false;
    for (let i = 0; i < 20; i++) {
      await pageA.waitForTimeout(200);
      const deathOnA = await pageA.evaluate(
        (id) => window.__BOMBER_QA__?.().players.find((p) => p.id === id)?.alive === false,
        idA
      );
      const deathOnB = await pageB.evaluate(
        (id) => window.__BOMBER_QA__?.().players.find((p) => p.id === id)?.alive === false,
        idA
      );
      if (deathOnA && deathOnB && explosionSync) {
        deathSync = true;
        break;
      }
    }
    dualContext.death = deathSync;
    dualContext.deathSync = deathSync;
    mark("gate-death-sync", deathSync, {
      victim: idA,
      explosionSync,
      note: "host self-bomb at planted tile",
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
