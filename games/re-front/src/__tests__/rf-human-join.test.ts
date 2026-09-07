import assert from "node:assert/strict";
import test from "node:test";

import { createRfWorld, reconcileHumans } from "../re-front-engine";

test("reconcile adds late Guest as a human nation so Host can see them", () => {
  const world = createRfWorld("host-id", "RFHost", [{ id: "host-id", nickname: "RFHost" }]);
  const beforeHumans = Object.values(world.nations).filter((n) => !n.isBot);
  assert.equal(beforeHumans.length, 1);

  reconcileHumans(world, [
    { id: "host-id", nickname: "RFHost" },
    { id: "guest-id", nickname: "RFGuest" },
  ]);

  const humans = Object.values(world.nations).filter((n) => !n.isBot);
  assert.equal(humans.length, 2);
  assert.equal(world.nations["guest-id"]?.isBot, false);
  assert.equal(world.nations["guest-id"]?.alive, true);
  assert.equal(world.nations["guest-id"]?.nickname, "RFGuest");
});
