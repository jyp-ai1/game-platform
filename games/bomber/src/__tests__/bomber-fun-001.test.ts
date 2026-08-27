import assert from "node:assert/strict";
import test from "node:test";

import {
  BOMBER_MAX_ROUNDS,
  createBomberWorld,
  getRoundDifficulty,
  MAP_NAMES,
  plantBomb,
  ROUND_DIFFICULTY,
  tickBomberWorld,
  tryMove,
  type BomberWorld,
} from "../bomber-engine";

function stripBots(world: BomberWorld): void {
  for (const id of Object.keys(world.players)) {
    if (world.players[id]?.isBot) delete world.players[id];
  }
}

test("FUN-001: Normal ladder R1→R3 escalates AI / fuse / blast / timer", () => {
  const r1 = getRoundDifficulty(1, "normal");
  const r2 = getRoundDifficulty(2, "normal");
  const r3 = getRoundDifficulty(3, "normal");

  assert.equal(r1.label, "normal");
  assert.equal(r2.label, "hard");
  assert.equal(r3.label, "very-hard");

  // Above prior Normal (aiTickEvery 14 / bombChance 0.008)
  assert.ok(r1.aiTickEvery < 14, "R1 AI faster than old Normal");
  assert.ok(r1.aiBombChance > 0.008, "R1 plants more than old Normal");
  assert.ok(r2.aiTickEvery < r1.aiTickEvery);
  assert.ok(r3.aiTickEvery < r2.aiTickEvery);
  assert.ok(r2.aiBombChance > r1.aiBombChance);
  assert.ok(r3.aiBombChance > r2.aiBombChance);
  assert.ok(r2.fuseMs < r1.fuseMs);
  assert.ok(r3.fuseMs < r2.fuseMs);
  assert.ok(r2.bombRange >= r1.bombRange);
  assert.ok(r3.bombRange > r2.bombRange);
  assert.ok(r2.timeLimitSec < r1.timeLimitSec);
  assert.ok(r3.timeLimitSec < r2.timeLimitSec);
  assert.ok(r3.powerUpChance > r2.powerUpChance);
  assert.ok(r3.baseSpeedBonus >= 1);
  assert.ok(r3.bombsMax > r1.bombsMax);
});

test("FUN-001: maps rotate Corridors → Open → Dense across rounds", () => {
  const w = createBomberWorld("local", "You", 2, "normal");
  assert.equal(w.round, 1);
  assert.equal(w.mapId, 0);
  assert.equal(MAP_NAMES[w.mapId], "Corridors");
  assert.equal(w.maxRounds, BOMBER_MAX_ROUNDS);

  assert.equal(MAP_NAMES[(2 - 1) % MAP_NAMES.length], "Open Center");
  assert.equal(MAP_NAMES[(3 - 1) % MAP_NAMES.length], "Dense Maze");
});

test("FUN-001: bomb visible in world + explosion kills on cell", () => {
  const w = createBomberWorld("local", "You", 2, "normal");
  stripBots(w);
  // Victim stands in blast lane (no AI interference)
  w.players.victim = {
    id: "victim",
    nickname: "Victim",
    color: "#fff",
    x: 3,
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
  me.alive = true;
  w.grid[1]![2] = "empty";
  w.grid[1]![3] = "empty";
  w.bombs = [];
  w.blasts = [];

  const t0 = 5_000;
  plantBomb(w, "local", t0);
  assert.equal(w.bombs.length, 1);
  assert.equal(w.bombs[0]!.x, 1);
  assert.equal(w.bombs[0]!.y, 1);

  tickBomberWorld(w, t0 + w.fuseMs - 20);
  assert.equal(w.players.victim!.alive, true);
  assert.equal(w.bombs.length, 1);

  tickBomberWorld(w, t0 + w.fuseMs + 20);
  assert.equal(w.bombs.length, 0);
  assert.ok(w.blasts.length >= 1, "blast cells spawned");
  assert.equal(w.players.victim!.alive, false);
  assert.ok(me.kills >= 1);
});

test("FUN-001: power-up pickup raises bomb capacity", () => {
  const w = createBomberWorld("local", "You", 2, "normal");
  stripBots(w);
  const me = w.players.local!;
  me.x = 1;
  me.y = 1;
  me.speedBonus = 0;
  const before = me.bombsMax;
  w.grid[1]![2] = "empty";
  w.powerUps = [{ id: "pu-t", kind: "bomb", x: 2, y: 1 }];
  tryMove(w, "local", 1, 0);
  assert.equal(me.x, 2);
  assert.equal(me.bombsMax, before + 1);
  assert.equal(w.powerUps.length, 0);
});

test("FUN-001: ROUND_DIFFICULTY ladder length + labels", () => {
  assert.equal(ROUND_DIFFICULTY.length, 4);
  assert.deepEqual(
    ROUND_DIFFICULTY.map((d) => d.label),
    ["easy", "normal", "hard", "very-hard"]
  );
});
