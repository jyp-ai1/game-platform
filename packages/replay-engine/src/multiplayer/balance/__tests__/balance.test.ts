/** Balance Engine unit tests */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { balanceFor, computeBalance } from "../index";
import { getMatchSizeProfile } from "../registry";

describe("Universal Balance Engine", () => {
  it("1 player — small map, fast tempo, high food", () => {
    const b = computeBalance({ baseWorldSize: 100, baseFoodDensity: 200, baseRespawnMs: 3000 }, 1);
    assert.equal(b.worldSize, 100);
    assert.ok(b.foodCount >= 260);
    assert.ok(b.physicsTickMs < 120);
    assert.equal(b.mapScale, 1);
  });

  it("2 players — map 1.8x", () => {
    const b = computeBalance({ baseWorldSize: 100, baseFoodDensity: 200, baseRespawnMs: 3000 }, 2);
    assert.ok(b.worldSize >= 170 && b.worldSize <= 190);
    assert.ok(b.foodCount >= 320);
    assert.ok(b.respawnMs < 3000);
  });

  it("20 players — festival scale", () => {
    const b = balanceFor("snake", 20);
    assert.ok(b.worldSize >= 650);
    assert.ok(b.foodCount >= 1600);
    assert.ok(b.bossEventsEnabled);
    assert.ok(b.features.some((f) => f.type === "boss_zone"));
  });

  it("snake match profile 2-20", () => {
    const p = getMatchSizeProfile("snake");
    assert.equal(p.minPlayers, 2);
    assert.equal(p.maxPlayers, 20);
  });

  it("runtime ticks scale with players", () => {
    const low = balanceFor("snake", 2);
    const high = balanceFor("snake", 20);
    assert.ok(high.physicsTickMs <= low.physicsTickMs);
    assert.ok(high.cameraZoom < low.cameraZoom);
  });
});
