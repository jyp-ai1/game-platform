/** Balance Engine unit tests */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { balanceFor, computeBalance } from "../index";
import { getMatchSizeProfile } from "../registry";

describe("Universal Balance Engine", () => {
  it("1P — 100x100 dynamic map", () => {
    const b = computeBalance({ baseWorldSize: 100, baseFoodDensity: 200, baseRespawnMs: 3000 }, 1);
    assert.equal(b.worldSize, 100);
    assert.equal(b.matchType, "solo");
    assert.ok(b.spawnShieldMs >= 3000);
  });

  it("2P — 180x180 duel", () => {
    const b = computeBalance({ baseWorldSize: 100, baseFoodDensity: 200, baseRespawnMs: 3000 }, 2);
    assert.equal(b.worldSize, 180);
    assert.equal(b.matchType, "duel");
    assert.ok(b.antiCampEnabled);
  });

  it("20P — 900x900 festival", () => {
    const b = balanceFor("snake", 20);
    assert.equal(b.worldSize, 900);
    assert.equal(b.matchType, "festival");
    assert.ok(b.bossEventsEnabled);
    assert.ok(b.dynamicEventsEnabled);
    assert.ok(b.features.some((f) => f.type === "biome"));
  });

  it("snake match profile 2-20", () => {
    const p = getMatchSizeProfile("snake");
    assert.equal(p.minPlayers, 2);
    assert.equal(p.maxPlayers, 20);
  });

  it("runtime ticks scale with players", () => {
    const low = balanceFor("snake", 2);
    const high = balanceFor("snake", 20);
    assert.ok(high.worldSize > low.worldSize);
    assert.ok(high.cameraZoom < low.cameraZoom);
  });
});
