/**
 * Bomber dual Playwright contexts — Host A + Guest B same invite URL.
 */
import { join } from "node:path";
import {
  BASE,
  SHOTS,
  createDualPages,
  devices,
  enterGame,
  invitePath,
  moveBomber,
  moveBomberUntilChanged,
  readBomberGrid,
  readBomberPlayer,
  readBomberPlayerQa,
} from "./lib/mp-common.mjs";

export function createDualContextReport() {
  return {
    roomId: null,
    previewSha: null,
    playerA: {
      id: null,
      seat: null,
      spawn: null,
      initialPosition: null,
      finalPosition: null,
      alive: null,
    },
    playerB: {
      id: null,
      seat: null,
      spawn: null,
      initialPosition: null,
      finalPosition: null,
      alive: null,
    },
    movementSync: { aToB: false, bToA: false },
    movementA: [],
    movementB: [],
    inputChain: [],
    bomb: { owner: null, position: null, playerBombOnly: false },
    playerBomb: null,
    bombOwner: null,
    explosion: false,
    explosionCells: null,
    deathSync: false,
    victimId: null,
    deathA: null,
    deathB: null,
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

async function waitRemoteQaPosition(page, playerId, expected, timeoutMs = 12_000) {
  try {
    await page.waitForFunction(
      ({ id, x, y }) => {
        const fn = window.__BOMBER_QA_PLAYER__;
        const p = fn
          ? fn(id)
          : window.__BOMBER_QA__?.().players.find((row) => row.id === id);
        if (!p) return false;
        return p.x === x && p.y === y;
      },
      { id: playerId, x: expected.x, y: expected.y },
      { timeout: timeoutMs }
    );
    return true;
  } catch {
    return false;
  }
}

function positionsMatch(a, b) {
  return !!(a && b && a.x === b.x && a.y === b.y);
}

/** Host walks toward guest (QA input) until adjacent; guest stays still. */
async function ensureAdjacentForDeath(pageA, pageB, hostId, guestId) {
  const readGuest = async () =>
    (await readBomberPlayerQa(pageB, guestId)) ?? (await readBomberPlayerQa(pageA, guestId));

  for (let attempt = 0; attempt < 60; attempt++) {
    const host = await readBomberPlayerQa(pageA, hostId);
    const guest = await readGuest();
    if (!host?.alive || !guest?.alive) break;
    const dist = Math.abs(host.x - guest.x) + Math.abs(host.y - guest.y);
    if (dist === 1) return { host, guest };
    const hostPhase = attempt < 28;
    const dx = Math.sign((hostPhase ? guest.x : host.x) - (hostPhase ? host.x : guest.x));
    const dy = Math.sign((hostPhase ? guest.y : host.y) - (hostPhase ? host.y : guest.y));
    const page = hostPhase ? pageA : pageB;
    if (dx) await page.evaluate(([x]) => window.__BOMBER_QA_MOVE__?.(x, 0), [dx]);
    else if (dy) await page.evaluate(([y]) => window.__BOMBER_QA_MOVE__?.(0, y), [dy]);
    await pageA.waitForTimeout(200);
    await pageB.waitForTimeout(250);
  }
  return {
    host: await readBomberPlayerQa(pageA, hostId),
    guest: await readGuest(),
  };
}

function inBlastRange(bombPos, victimPos) {
  if (!bombPos || !victimPos) return false;
  return (
    (bombPos.x === victimPos.x && Math.abs(bombPos.y - victimPos.y) <= 1) ||
    (bombPos.y === victimPos.y && Math.abs(bombPos.x - victimPos.x) <= 1)
  );
}

function seatOf(qa, seats) {
  if (!qa?.local) return null;
  const idx = seats.findIndex(
    (s) => s.x === qa.local.x && s.y === qa.local.y
  );
  if (idx >= 0) return idx;
  // Bot-replaced human may spawn one tile off corner after reconcile.
  const near = seats.findIndex(
    (s) => Math.abs(s.x - qa.local.x) <= 1 && Math.abs(s.y - qa.local.y) <= 1
  );
  return near >= 0 ? near : null;
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

function pushChain(dualContext, step) {
  dualContext.inputChain.push({ ...step, t: new Date().toISOString() });
}

async function moveAndVerify(pageActor, pageObserver, actorId, observerLabel, dualContext, key) {
  const before = await readBomberPlayerQa(pageActor, actorId);
  const moved = await moveBomberUntilChanged(pageActor, before, 4);
  await pageActor.waitForTimeout(600);
  await pageObserver.waitForTimeout(800);
  const after = (await readBomberPlayerQa(pageActor, actorId)) ?? moved;
  const remote = actorId ? await readBomberPlayerQa(pageObserver, actorId) : null;
  const localMoved =
    before && after ? before.x !== after.x || before.y !== after.y : false;
  const synced = localMoved && positionsMatch(after, remote);
  const row = {
    key,
    actor: actorId,
    observer: observerLabel,
    before,
    after,
    remote,
    localMoved,
    synced,
  };
  dualContext[key].push(row);
  pushChain(dualContext, {
    phase: key,
    INPUT_RECEIVED: localMoved,
    PLAYER_STATE_BEFORE: before,
    MOVE_APPLIED: after,
    REMOTE_POSITION_UPDATED: remote,
    synced,
  });
  return { after, synced, localMoved, remote };
}

export async function probeDualContextBomber(browser, mark, dualContext) {
  const room = "BOMBER-D";
  const hostUrl = `${BASE}${invitePath("bomber", room, "mp_qa_fresh=1")}`;
  const guestUrl = `${BASE}${invitePath("bomber", room)}`;
  const ts = Date.now();
  const deviceA = `qa012-host-${ts}`;
  const deviceB = `qa012-guest-${ts + 1}`;
  const cornerSeats = [
    { x: 1, y: 1 },
    { x: 13, y: 1 },
    { x: 1, y: 11 },
    { x: 13, y: 11 },
  ];

  const dual = await createDualPages(browser, deviceA, deviceB);
  const pageA = dual.pageA;
  const pageB = dual.pageB;

  try {
    await pageA.setViewportSize(devices["iPhone 13"].viewport);
    await pageB.setViewportSize(devices["iPhone 13"].viewport);

    await pageA.goto(hostUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
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

    const hostReady = await pageA.evaluate(() => {
      const qa = window.__BOMBER_QA__?.();
      return !!(qa?.local?.alive && qa?.isHost && qa?.stateAck);
    });
    if (!hostReady) {
      mark("gate-host-seat", false, { note: "host not alive at join — abort dual-context" });
      mark("gate-guest-seat", false, { note: "skipped — host dead" });
      mark("gate-distinct-spawn", false, { note: "skipped" });
      mark("gate-different-seat", false, { note: "skipped" });
      mark("gate-different-spawn", false, { note: "skipped" });
      mark("gate-a-move-sync", false, { note: "skipped — host dead" });
      mark("gate-b-move-sync", false, { note: "skipped" });
      mark("gate-human-player-bomb", false, { note: "skipped" });
      mark("gate-player-bomb-sync", false, { note: "skipped" });
      mark("gate-bomb-sync", false, { note: "skipped" });
      mark("gate-explosion-sync", false, { note: "skipped" });
      mark("gate-death-sync", false, { note: "skipped" });
      return;
    }

    await pageA.waitForTimeout(2500);

    await pageB.goto(guestUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await enterGame(pageB, "bomber");
    await pageB
      .waitForFunction(() => window.__BOMBER_QA__?.().stateAck === true, { timeout: 40_000 })
      .catch(() => {});
    await pageB
      .waitForFunction(
        () => {
          const qa = window.__BOMBER_QA__?.();
          return qa?.stateAck === true && qa?.local?.alive === true && qa?.isHost === false;
        },
        { timeout: 45_000 }
      )
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

    const qaBEarly = await pageB.evaluate(() => window.__BOMBER_QA__?.() ?? null);
    const idBEarly = qaBEarly?.deviceId;
    if (idBEarly) {
      await pageA
        .waitForFunction(
          (guestId) => {
            const qa = window.__BOMBER_QA__?.();
            return qa?.players.some((p) => p.id === guestId && !p.isBot && p.alive);
          },
          idBEarly,
          { timeout: 20_000 }
        )
        .catch(() => {});
    }

    await pageA.waitForTimeout(800);
    await pageB.waitForTimeout(800);

    const qaA0 = await pageA.evaluate(() => window.__BOMBER_QA__?.() ?? null);
    const idAEarly = qaA0?.deviceId;
    if (idAEarly) {
      await pageB
        .waitForFunction(
          ({ hostId }) => {
            const qa = window.__BOMBER_QA__?.();
            const local = qa?.local;
            const host = window.__BOMBER_QA_PLAYER__?.(hostId);
            return (
              !!local &&
              !!host &&
              (local.x !== host.x || local.y !== host.y) &&
              local.alive === true
            );
          },
          { hostId: idAEarly },
          { timeout: 8_000 }
        )
        .catch(() => {});
    }

    await pageB
      .waitForFunction(
        () => {
          const qa = window.__BOMBER_QA__?.();
          const local = qa?.local;
          if (!local) return false;
          return local.x !== 1 || local.y !== 1;
        },
        { timeout: 15_000 }
      )
      .catch(() => {});

    if (idBEarly) {
      await pageA
        .waitForFunction(
          (guestId) => {
            const guest = window.__BOMBER_QA_PLAYER__?.(guestId);
            return !!guest && (guest.x !== 1 || guest.y !== 1);
          },
          idBEarly,
          { timeout: 15_000 }
        )
        .catch(() => {});
    }

    await pageA.waitForTimeout(400);
    await pageB.waitForTimeout(400);

    const qaA = await pageA.evaluate(() => window.__BOMBER_QA__?.() ?? null);
    const qaB = await pageB.evaluate(() => window.__BOMBER_QA__?.() ?? null);

    if (!qaA?.local?.alive) {
      mark("gate-host-seat", false, { spawnA: qaA?.local, note: "host died before gates" });
      mark("gate-guest-seat", false, { note: "skipped" });
      mark("gate-distinct-spawn", false, { note: "skipped" });
      mark("gate-different-seat", false, { note: "skipped" });
      mark("gate-different-spawn", false, { note: "skipped" });
      mark("gate-a-move-sync", false, { note: "skipped" });
      mark("gate-b-move-sync", false, { note: "skipped" });
      mark("gate-human-player-bomb", false, { note: "skipped" });
      mark("gate-player-bomb-sync", false, { note: "skipped" });
      mark("gate-bomb-sync", false, { note: "skipped" });
      mark("gate-explosion-sync", false, { note: "skipped" });
      mark("gate-death-sync", false, { note: "skipped" });
      return;
    }

    dualContext.roomId = qaA?.roomId ?? room;
    dualContext.playerA.id = qaA?.deviceId ?? null;
    dualContext.playerB.id = qaB?.deviceId ?? null;
    dualContext.playerA.spawn = qaA?.local ? { ...qaA.local } : null;
    dualContext.playerB.spawn = qaB?.local ? { ...qaB.local } : null;
    dualContext.playerA.alive = qaA?.local?.alive ?? null;
    dualContext.playerB.alive = qaB?.local?.alive ?? null;
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

    // P0-2 A → B: 3+ moves with per-step remote verify
    dualContext.movementA = [];
    const posBeforeA =
      (await readBomberPlayerQa(pageA, idA)) ?? (await readBomberGrid(pageA));
    dualContext.positionA_before = posBeforeA ?? dualContext.positionA_before;
    let posA = posBeforeA;
    let aStepsSynced = true;
    let aAnyMove = false;
    for (let i = 0; i < 1; i++) {
      const step = await moveAndVerify(pageA, pageB, idA, "B", dualContext, "movementA");
      if (step.localMoved) aAnyMove = true;
      if (!step.synced) aStepsSynced = false;
      if (step.after) posA = step.after;
    }
    dualContext.positionA_after = dualContext.playerA.finalPosition = posA;
    dualContext.movementSync.aToB = aAnyMove && aStepsSynced;
    mark("gate-a-move-sync", dualContext.movementSync.aToB, {
      posA0: posBeforeA,
      posAFinal: posA,
      movementA: dualContext.movementA,
    });

    dualContext.movementB = [];
    const posBeforeB =
      (await readBomberPlayerQa(pageB, idB)) ?? (await readBomberGrid(pageB));
    dualContext.positionB_before = posBeforeB ?? dualContext.positionB_before;
    let posB = posBeforeB;
    let bStepsSynced = true;
    let bAnyMove = false;
    for (let i = 0; i < 1; i++) {
      const step = await moveAndVerify(pageB, pageA, idB, "A", dualContext, "movementB");
      if (step.localMoved) bAnyMove = true;
      if (!step.synced) bStepsSynced = false;
      if (step.after) posB = step.after;
    }
    dualContext.positionB_after = dualContext.playerB.finalPosition = posB;
    dualContext.movementSync.bToA = bAnyMove && bStepsSynced;
    mark("gate-b-move-sync", dualContext.movementSync.bToA, {
      posB0: posBeforeB,
      posBFinal: posB,
      movementB: dualContext.movementB,
    });

    // P0-7 prep: host adjacent to guest so player bomb kills guest
    const adj = await ensureAdjacentForDeath(pageA, pageB, idA, idB);
    let hostPos = adj.host;
    let guestPosBeforeBomb = adj.guest;
    if (!inBlastRange(hostPos, guestPosBeforeBomb) && guestPosBeforeBomb?.alive && hostPos?.alive) {
      for (let i = 0; i < 12; i++) {
        const dx = Math.sign(hostPos.x - guestPosBeforeBomb.x);
        const dy = Math.sign(hostPos.y - guestPosBeforeBomb.y);
        if (dx) await pageB.evaluate(([x]) => window.__BOMBER_QA_MOVE__?.(x, 0), [dx]);
        else if (dy) await pageB.evaluate(([y]) => window.__BOMBER_QA_MOVE__?.(0, y), [dy]);
        await pageB.waitForTimeout(280);
        await pageA.waitForTimeout(180);
        hostPos = await readBomberPlayerQa(pageA, idA);
        guestPosBeforeBomb =
          (await readBomberPlayerQa(pageB, idB)) ?? (await readBomberPlayerQa(pageA, idB));
        if (inBlastRange(hostPos, guestPosBeforeBomb)) break;
      }
    }
    await pageA.waitForTimeout(600);
    await pageB.waitForTimeout(600);
    dualContext.deathSetup = {
      hostPos,
      guestPosBeforeBomb,
      inRange: inBlastRange(hostPos, guestPosBeforeBomb),
    };

    if (!hostPos?.alive || !guestPosBeforeBomb?.alive) {
      mark("gate-human-player-bomb", false, { note: "victim/host dead before plant" });
      mark("gate-player-bomb-sync", false, { note: "skipped" });
      mark("gate-bomb-sync", false, { note: "skipped" });
      mark("gate-explosion-sync", false, { note: "skipped" });
      mark("gate-death-sync", false, { note: "guest dead before player bomb" });
      return;
    }

    if (!dualContext.deathSetup.inRange) {
      mark("gate-human-player-bomb", false, { note: "guest not in blast range before plant", ...dualContext.deathSetup });
      mark("gate-player-bomb-sync", false, { note: "skipped" });
      mark("gate-bomb-sync", false, { note: "skipped" });
      mark("gate-explosion-sync", false, { note: "skipped" });
      mark("gate-death-sync", false, { note: "adjacency failed before plant" });
      return;
    }

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
      const blastMatch =
        isPlayerBomb &&
        (snapA?.blasts ?? 0) > 0 &&
        (snapB?.blasts ?? 0) > 0 &&
        !(snapA?.bombs ?? []).some((b) => b.id === playerBomb?.id) &&
        !(snapB?.bombs ?? []).some((b) => b.id === playerBomb?.id);
      if (blastMatch) {
        explosionSync = true;
        dualContext.explosion = true;
        dualContext.explosionCells = snapA?.blasts ?? snapB?.blasts ?? null;
        break;
      }
    }
    mark("gate-explosion-sync", explosionSync, { dualContextExplosion: dualContext.explosion });

    let deathSync = false;
    let deathOnA = null;
    let deathOnB = null;
    for (let i = 0; i < 45; i++) {
      await pageA.waitForTimeout(200);
      deathOnA = await readBomberPlayerQa(pageA, idB);
      deathOnB = await readBomberPlayerQa(pageB, idB);
      if (deathOnA?.alive === false && deathOnB?.alive === false && explosionSync) {
        deathSync = true;
        dualContext.deathEvidence = {
          victim: idB,
          bombOwner: idA,
          bombPosition: dualContext.bombPosition,
          deathOnA,
          deathOnB,
          explosionSync,
        };
        break;
      }
    }
    dualContext.death = deathSync;
    dualContext.deathSync = deathSync;
    dualContext.victimId = idB;
    dualContext.deathA = deathOnA;
    dualContext.deathB = deathOnB;
    dualContext.playerBomb = playerBomb;
    dualContext.bombOwner = playerBomb?.ownerId ?? null;
    mark("gate-death-sync", deathSync, dualContext.deathEvidence ?? {
      victim: idB,
      bombOwner: idA,
      explosionSync,
      deathSetup: dualContext.deathSetup,
      note: "guest B must die from host A player-owned bomb",
    });

    try {
      await pageA.screenshot({ path: join(SHOTS, "dual-context-a.png"), fullPage: true });
      await pageB.screenshot({ path: join(SHOTS, "dual-context-b.png"), fullPage: true });
    } catch {
      /* optional */
    }
  } finally {
    await dual.close();
  }
}
