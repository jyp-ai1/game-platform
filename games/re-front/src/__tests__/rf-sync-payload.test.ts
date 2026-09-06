import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRfSyncDelta,
  createRfSyncTracker,
  createRfWorld,
  serializeRfState,
  tickRfWorld,
} from "../re-front-engine";

test("Re:Front sync payload sizes", () => {
  const humans = [{ deviceId: "p1", nickname: "A", color: "#f00" }];
  let world = createRfWorld("p1", "A", humans);
  for (let i = 0; i < 5; i++) tickRfWorld(world);

  const legacy = JSON.stringify(serializeRfState(world));
  const tracker = createRfSyncTracker(world);
  tickRfWorld(world);
  const delta = JSON.stringify(buildRfSyncDelta(tracker, world));

  assert.ok(legacy.length > 40_000, `legacy grid snapshot ${legacy.length}`);
  assert.ok(delta.length <= 5_120, `delta target <=5KB, got ${delta.length}`);

  console.log(
    JSON.stringify({
      legacyBytes: legacy.length,
      deltaBytes: delta.length,
      reductionPct: Math.round((1 - delta.length / legacy.length) * 100),
    })
  );
});
