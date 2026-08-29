import assert from "node:assert/strict";
import test from "node:test";

import { createBomberWorld, reconcileHumans, rosterForMap } from "../bomber-engine";

test("ONLINE-004: host seat 0, guest seat 1 on join", () => {
  const hostId = "host-a";
  const guestId = "guest-b";
  const w = createBomberWorld(hostId, "Host", {
    mapId: 1,
    humans: [{ id: hostId, nickname: "Host" }],
  });
  const seats = [
    { x: 1, y: 1 },
    { x: 13, y: 1 },
    { x: 1, y: 11 },
    { x: 13, y: 11 },
  ];

  assert.equal(w.players[hostId]!.x, seats[0]!.x);
  assert.equal(w.players[hostId]!.y, seats[0]!.y);

  reconcileHumans(
    w,
    [
      { id: hostId, nickname: "Host" },
      { id: guestId, nickname: "Guest" },
    ],
    { hostId }
  );

  assert.ok(w.players[hostId], "host must keep human seat");
  assert.ok(w.players[guestId], "guest must get human seat");
  assert.equal(w.players[hostId]!.x, seats[0]!.x);
  assert.equal(w.players[guestId]!.x, seats[1]!.x);
  assert.equal(Object.keys(w.players).length, rosterForMap(1));
});

test("ONLINE-004: pinned host survives brief room desync", () => {
  const hostId = "host-a";
  const w = createBomberWorld(hostId, "Host", { mapId: 1 });
  const hx = w.players[hostId]!.x;
  const hy = w.players[hostId]!.y;

  reconcileHumans(w, [{ id: "guest-b", nickname: "Guest" }], { hostId });

  assert.ok(w.players[hostId], "host pinned when guest list omits host briefly");
  assert.equal(w.players[hostId]!.x, hx);
  assert.equal(w.players[hostId]!.y, hy);
  assert.ok(w.players["guest-b"]);
});
