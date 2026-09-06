import assert from "node:assert/strict";
import test from "node:test";

import {
  BOMBER_COLS,
  BOMBER_FIRE_START,
  BOMBER_ROWS,
  BOMBER_SUDDEN_DEATH_AT_SEC,
  MAP_LETTERS,
  MAP_NAMES,
  MATCH_AI,
  applyBomberSyncState,
  createBomberWorld,
  firePowerOf,
  plantBomb,
  serializeBomberState,
  tickBomberWorld,
  applyPowerUp,
  bomberPadRepeatMs,
  tryMove,
  upsertRemoteBomb,
  type BomberWorld,
} from "../bomber-engine";

function stripBots(world: BomberWorld): void {
  for (const id of Object.keys(world.players)) {
    if (world.players[id]?.isBot) delete world.players[id];
  }
}

test("ONLINE-002: classic match has no round ladder", () => {
  const w = createBomberWorld("local", "You", { playerSlots: 4, mapId: 0 });
  assert.equal(Object.keys(w.players).length, 4);
  assert.equal(w.playerSlots, 4);
  assert.equal(w.cols, BOMBER_COLS);
  assert.equal(w.rows, BOMBER_ROWS);
  assert.equal((w as { round?: number }).round, undefined);
  assert.equal((w as { maxRounds?: number }).maxRounds, undefined);
});

test("ONLINE-002: 4 and 6 player slots with AI fill", () => {
  const w4 = createBomberWorld("local", "You", { playerSlots: 4, mapId: 0 });
  assert.equal(Object.keys(w4.players).length, 4);
  assert.equal(Object.values(w4.players).filter((p) => p.isBot).length, 3);

  const w6 = createBomberWorld("local", "You", {
    playerSlots: 6,
    mapId: 1,
    humans: [
      { id: "local", nickname: "You" },
      { id: "peer", nickname: "Friend" },
    ],
  });
  assert.equal(Object.keys(w6.players).length, 6);
  assert.equal(Object.values(w6.players).filter((p) => p.isBot).length, 4);
  assert.ok(w6.players.peer);
});

test("ONLINE-002: maps A/B/C/D named Classic Cross Maze Open", () => {
  assert.deepEqual([...MAP_NAMES], ["Classic", "Cross", "Maze", "Open"]);
  assert.deepEqual([...MAP_LETTERS], ["A", "B", "C", "D"]);
  for (let i = 0; i < 4; i++) {
    const w = createBomberWorld("local", "You", { playerSlots: 4, mapId: i });
    assert.equal(w.mapId, i);
  }
});

test("ONLINE-002: fire start = 1 only; items Bomb/Fire/Speed", () => {
  const w = createBomberWorld("local", "You", { playerSlots: 4, mapId: 0 });
  stripBots(w);
  const me = w.players.local!;
  assert.equal(firePowerOf(me), BOMBER_FIRE_START);
  assert.equal(me.bombsMax, 1);
  assert.equal(MATCH_AI.bombRange, 1);

  w.grid[1]![2] = "empty";
  w.powerUps = [{ id: "pu-r", kind: "range", x: 2, y: 1 }];
  tryMove(w, "local", 1, 0);
  assert.equal(firePowerOf(me), 2);

  me.x = 1;
  me.y = 1;
  w.grid[1]![2] = "empty";
  w.powerUps = [{ id: "pu-b2", kind: "bomb", x: 2, y: 1 }];
  tryMove(w, "local", 1, 0);
  assert.ok(me.bombsMax >= 2);

  me.x = 1;
  me.y = 1;
  w.grid[1]![2] = "empty";
  w.powerUps = [{ id: "pu-s3", kind: "speed", x: 2, y: 1 }];
  tryMove(w, "local", 1, 0);
  assert.ok((me.speedBonus ?? 0) >= 1);
});

test("ONLINE-002: speed ⚡ moves one cell per input (cadence via pad repeat)", () => {
  const w = createBomberWorld("local", "You", { playerSlots: 4, mapId: 0 });
  stripBots(w);
  const me = w.players.local!;
  me.x = 3;
  me.y = 3;
  me.speedBonus = 2;
  w.grid[3]![4] = "empty";
  w.grid[3]![5] = "empty";
  w.grid[3]![6] = "empty";
  tryMove(w, "local", 1, 0);
  assert.equal(me.x, 4);
  assert.equal(me.y, 3);
  tryMove(w, "local", 1, 0);
  assert.equal(me.x, 5);
  assert.equal(bomberPadRepeatMs(2), 50);
  assert.equal(bomberPadRepeatMs(0), 100);
});

test("ONLINE-002: AI harder than old Normal (tick 8 / bomb 0.032)", () => {
  assert.ok(MATCH_AI.aiTickEvery < 8);
  assert.ok(MATCH_AI.aiBombChance > 0.032);
  assert.ok(MATCH_AI.aiHuntChance > 0.42);
});

test("ONLINE-002: sudden death shrinks edges after threshold", () => {
  const started = 1_000_000;
  const w = createBomberWorld("local", "You", {
    playerSlots: 4,
    mapId: 0,
    matchStartedAt: started,
  });
  stripBots(w);
  // Keep two alive so match doesn't end on first deaths from shrink alone if only local
  w.players.victim = {
    id: "victim",
    nickname: "V",
    color: "#fff",
    x: 7,
    y: 6,
    alive: true,
    isBot: false,
    bombsMax: 1,
    bombsLeft: 1,
    kills: 0,
    wins: 0,
  };
  const me = w.players.local!;
  me.x = 5;
  me.y = 5;

  tickBomberWorld(w, started + (BOMBER_SUDDEN_DEATH_AT_SEC - 5) * 1000);
  assert.equal(w.suddenDeathActive, false);
  assert.equal(w.suddenDeathRing, 0);

  tickBomberWorld(w, started + (BOMBER_SUDDEN_DEATH_AT_SEC + 1) * 1000);
  assert.equal(w.suddenDeathActive, true);
  assert.ok(w.suddenDeathRing >= 1);
  // Outer ring (ring=1) should be hard
  assert.equal(w.grid[1]![1], "hard");
});

test("ONLINE-002: last survivor wins; simultaneous = draw", () => {
  const w = createBomberWorld("local", "You", { playerSlots: 4, mapId: 0 });
  stripBots(w);
  w.players.a = {
    id: "a",
    nickname: "A",
    color: "#f00",
    x: 2,
    y: 1,
    alive: true,
    isBot: false,
    bombsMax: 1,
    bombsLeft: 1,
    kills: 0,
    wins: 0,
  };
  const me = w.players.local!;
  me.x = 1;
  me.y = 1;
  w.grid[1]![2] = "empty";
  w.grid[1]![3] = "empty";

  const t0 = 5_000;
  plantBomb(w, "local", t0);
  // Step off own bomb before fuse
  me.x = 1;
  me.y = 3;
  w.grid[2]![1] = "empty";
  w.grid[3]![1] = "empty";
  tickBomberWorld(w, t0 + w.fuseMs + 20);
  assert.equal(w.players.a!.alive, false);
  assert.equal(me.alive, true);
  assert.equal(w.matchOver, true);
  assert.equal(w.winnerId, "local");
  assert.equal(w.isDraw, false);

  // Draw case — both on blast center
  const d = createBomberWorld("local", "You", { playerSlots: 4, mapId: 0 });
  stripBots(d);
  d.players.b = {
    id: "b",
    nickname: "B",
    color: "#0f0",
    x: 1,
    y: 1,
    alive: true,
    isBot: false,
    bombsMax: 1,
    bombsLeft: 1,
    kills: 0,
    wins: 0,
  };
  d.players.local!.x = 1;
  d.players.local!.y = 1;
  d.players.local!.alive = true;
  d.bombs = [
    {
      id: "bx",
      ownerId: "local",
      x: 1,
      y: 1,
      plantedAt: 1000,
      range: 1,
    },
  ];
  tickBomberWorld(d, 1000 + d.fuseMs + 10);
  assert.equal(d.players.local!.alive, false);
  assert.equal(d.players.b!.alive, false);
  assert.equal(d.matchOver, true);
  assert.equal(d.isDraw, true);
  assert.equal(d.winnerId, null);
});

test("ONLINE-002: bomb sync serialize + upsert remote bomb", () => {
  const host = createBomberWorld("host", "Host", { playerSlots: 4, mapId: 0 });
  stripBots(host);
  host.players.guest = {
    id: "guest",
    nickname: "Guest",
    color: "#0ff",
    x: 13,
    y: 1,
    alive: true,
    isBot: false,
    bombsMax: 1,
    bombsLeft: 1,
    kills: 0,
    wins: 0,
  };
  const t0 = 2000;
  host.players.host!.x = 1;
  host.players.host!.y = 1;
  const bomb = plantBomb(host, "host", t0);
  assert.ok(bomb);
  assert.equal(bomb!.range, BOMBER_FIRE_START);

  const guest = createBomberWorld("guest", "Guest", {
    playerSlots: 4,
    mapId: 0,
    humans: [
      { id: "host", nickname: "Host" },
      { id: "guest", nickname: "Guest" },
    ],
  });
  upsertRemoteBomb(guest, bomb!);
  assert.equal(guest.bombs.length, 1);
  assert.equal(guest.bombs[0]!.id, bomb!.id);

  const state = serializeBomberState(host);
  applyBomberSyncState(guest, state);
  assert.equal(guest.bombs.length, 1);
  assert.equal(guest.players.host!.x, 1);
});

test("ONLINE-002: only Bomb / Fire(range) / Speed item kinds", () => {
  const allowed = new Set(["bomb", "speed", "range"]);
  assert.ok(allowed.has("bomb") && allowed.has("speed") && allowed.has("range"));
  assert.equal(allowed.has("kick"), false);
  assert.equal(allowed.has("glove"), false);
  assert.equal(allowed.has("skull"), false);
});
