import assert from "node:assert/strict";
import test from "node:test";

import {
  applyExpand,
  createRfWorld,
  eliminateNation,
  findExpandTargets,
  RF_GRID,
  RF_VICTORY_PCT,
} from "../re-front-engine";

test("real applyExpand reaches 70% and ends the round", () => {
  assert.equal(RF_GRID, 32);
  assert.equal(RF_VICTORY_PCT, 70);
  const world = createRfWorld("p1", "Host", [{ id: "p1", nickname: "Host" }]);
  let steps = 0;
  while (!world.roundOver && steps < RF_GRID * RF_GRID) {
    const me = world.nations.p1!;
    me.troops = 8000;
    const target = findExpandTargets(world, "p1", 1)[0];
    if (!target) break;
    applyExpand(world, target.cx, target.cy, "p1");
    steps += 1;
  }
  assert.equal(world.roundOver, true);
  assert.equal(world.winnerId, "p1");
  assert.ok((world.nations.p1?.territoryPct ?? 0) >= RF_VICTORY_PCT);
});

test("eliminating the last human ends the round with a bot winner", () => {
  const world = createRfWorld("p1", "Host", [{ id: "p1", nickname: "Host" }]);
  assert.equal(world.roundOver, false);
  eliminateNation(world, "p1");
  assert.equal(world.nations.p1?.alive, false);
  assert.equal(world.roundOver, true);
  assert.ok(world.winnerId && world.winnerId !== "p1");
  assert.equal(world.nations[world.winnerId!]?.isBot, true);
});
