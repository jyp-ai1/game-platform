import assert from "node:assert/strict";
import test from "node:test";

import { createRfWorld, nationCenter, reconcileHumans } from "../re-front-engine";
import { rfHumanNickname, rfHumanRoster } from "../rf-human-display";

test("late Guest spawns next to Host so both humans share the same map view", () => {
  const world = createRfWorld("host-id", "RFHost", [{ id: "host-id", nickname: "RFHost" }]);
  reconcileHumans(world, [
    { id: "host-id", nickname: "RFHost" },
    { id: "guest-id", nickname: "RFGuest" },
  ]);
  const host = nationCenter(world, "host-id");
  const guest = nationCenter(world, "guest-id");
  assert.ok(host && guest);
  const dist = Math.abs(host!.cx - guest!.cx) + Math.abs(host!.cy - guest!.cy);
  assert.ok(dist <= 12, `guest too far from host: ${dist}`);
});

test("HUD roster lists humans only with nicknames", () => {
  const names = rfHumanRoster([
    { id: "h", isBot: false, nickname: "RFHost06SM", territoryPct: 0.11, alive: true },
    { id: "b", isBot: true, nickname: "Red Kingdom", territoryPct: 0.1, alive: true },
    { id: "g", isBot: false, nickname: "RFGuest06SM", territoryPct: 0.1, alive: true },
  ]);
  assert.deepEqual(
    names.map((n) => n.nickname),
    ["RFHost06SM", "RFGuest06SM"]
  );
  assert.equal(rfHumanNickname("RFGuest06SM"), "RFGuest06S");
});
