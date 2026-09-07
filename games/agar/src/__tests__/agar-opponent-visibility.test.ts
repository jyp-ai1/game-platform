import assert from "node:assert/strict";
import test from "node:test";

import {
  createAgarWorld,
  reconcileAgarHumans,
  updateRankings,
} from "../agar-io-engine";

test("reconcile adds guest as human so host roster includes both", () => {
  const world = createAgarWorld("host-id", "QAHost");
  reconcileAgarHumans(world, [
    { id: "host-id", nickname: "QAHost" },
    { id: "guest-id", nickname: "QAGuest" },
  ]);

  const humans = Object.values(world.players).filter((p) => !p.isBot);
  assert.equal(humans.length, 2);
  assert.ok(world.players["guest-id"]);
  assert.equal(world.players["guest-id"]!.isBot, false);
  assert.equal(world.players["guest-id"]!.nickname, "QAGuest");
  assert.equal(world.players["guest-id"]!.alive, true);
});

test("TOP10 prefers humans on mass tie so guest stays visible", () => {
  const world = createAgarWorld("host-id", "QAHost");
  reconcileAgarHumans(world, [
    { id: "host-id", nickname: "QAHostK9PV" },
    { id: "guest-id", nickname: "QAGuestK9PV" },
  ]);
  updateRankings(world);

  const names = world.rankings.map((r) => r.nickname);
  assert.ok(names.includes("QAHostK9PV"));
  assert.ok(names.includes("QAGuestK9PV"));
  assert.equal(
    world.rankings.filter((r) => !world.players[r.id]?.isBot).length,
    2
  );
});
