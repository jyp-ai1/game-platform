import assert from "node:assert/strict";
import test from "node:test";

import type { ComputedBalance } from "@game-platform/shared";

import { createInitialWorld, tickWorld } from "../snake-io-engine";
import {
  buildSnakeWorldDelta,
  buildSnakeWorldSnapshot,
  createSnakeSyncTracker,
} from "../snake-world-sync";

const cfg = {
  foodCount: 400,
  features: [],
  speed: 1,
} as unknown as ComputedBalance;

test("Snake WORLD sync payload sizes", () => {
  const humans = Array.from({ length: 50 }, (_, i) => ({
    deviceId: `bot-${i}`,
    nickname: `Bot${i}`,
  }));
  humans.push({ deviceId: "local", nickname: "You" });

  let world = createInitialWorld(humans, cfg);
  for (let i = 0; i < 20; i++) world = tickWorld(world);

  const legacy = JSON.stringify(world);
  const snapshot = JSON.stringify(buildSnakeWorldSnapshot(world));
  const tracker = createSnakeSyncTracker(world);
  world = tickWorld(world);
  const delta = buildSnakeWorldDelta(tracker, world);
  const deltaJson = JSON.stringify(delta);

  assert.ok(legacy.length > 50_000, `legacy should be large, got ${legacy.length}`);
  assert.ok(snapshot.length < legacy.length * 0.5, `snapshot ${snapshot.length} vs legacy ${legacy.length}`);
  assert.ok(deltaJson.length <= 5_120, `delta target <=5KB, got ${deltaJson.length}`);

  console.log(
    JSON.stringify({
      legacyBytes: legacy.length,
      snapshotBytes: snapshot.length,
      deltaBytes: deltaJson.length,
      reductionPct: Math.round((1 - deltaJson.length / legacy.length) * 100),
    })
  );
});
