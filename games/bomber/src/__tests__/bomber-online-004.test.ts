import assert from "node:assert/strict";
import test from "node:test";

import { createBomberWorld, reconcileHumans, rosterForMap, tryMove, serializeBomberState, applyBomberSyncState } from "../bomber-engine";

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

test("ONLINE-004: reconcile does not reset moved humans", () => {
  const hostId = "host-a";
  const guestId = "guest-b";
  const w = createBomberWorld(hostId, "Host", {
    mapId: 1,
    humans: [
      { id: hostId, nickname: "Host" },
      { id: guestId, nickname: "Guest" },
    ],
  });
  tryMove(w, hostId, 1, 0);
  tryMove(w, hostId, 1, 0);
  const hx = w.players[hostId]!.x;
  const gy = w.players[guestId]!.y;
  reconcileHumans(
    w,
    [
      { id: hostId, nickname: "Host" },
      { id: guestId, nickname: "Guest" },
    ],
    { hostId }
  );
  assert.equal(w.players[hostId]!.x, hx, "host position must persist after reconcile");
  assert.equal(w.players[guestId]!.y, gy, "guest position must persist after reconcile");
});

test("ONLINE-004: overlap pin assigns guest to seat 1", () => {
  const hostId = "host-a";
  const guestId = "guest-b";
  const w = createBomberWorld(hostId, "Host", {
    mapId: 1,
    humans: [{ id: hostId, nickname: "Host" }],
  });
  reconcileHumans(w, [{ id: hostId, nickname: "Host" }, { id: guestId, nickname: "Guest" }], {
    hostId,
  });
  w.players[guestId]!.x = w.players[hostId]!.x;
  w.players[guestId]!.y = w.players[hostId]!.y;
  reconcileHumans(w, [{ id: hostId, nickname: "Host" }, { id: guestId, nickname: "Guest" }], {
    hostId,
  });
  assert.notEqual(w.players[hostId]!.x, w.players[guestId]!.x);
});

test("ONLINE-004: guest replacing dead bot spawns alive", () => {
  const hostId = "host-a";
  const guestId = "guest-b";
  const w = createBomberWorld(hostId, "Host", {
    mapId: 1,
    humans: [{ id: hostId, nickname: "Host" }],
  });
  const bot = Object.values(w.players).find((p) => p.isBot && p.x === 13 && p.y === 1);
  assert.ok(bot);
  bot!.alive = false;
  reconcileHumans(w, [{ id: hostId, nickname: "Host" }, { id: guestId, nickname: "Guest" }], {
    hostId,
  });
  assert.equal(w.players[guestId]!.alive, true, "guest must not inherit dead bot state");
  assert.equal(w.players[guestId]!.x, 13);
});

test("ONLINE-004: host can move from spawn on map B", () => {
  const hostId = "host-a";
  const w = createBomberWorld(hostId, "Host", { mapId: 1 });
  assert.equal(w.players[hostId]!.x, 1);
  assert.equal(w.players[hostId]!.y, 1);
  tryMove(w, hostId, 1, 0);
  assert.equal(w.players[hostId]!.x, 2);
});

test("ONLINE-004: reject stale tick on guest sync", () => {
  const hostId = "host-a";
  const w = createBomberWorld(hostId, "Host", { mapId: 1 });
  w.tick = 100;
  const stale = serializeBomberState(w);
  stale.tick = 50;
  const applied = applyBomberSyncState(w, stale, { rejectStaleTick: true });
  assert.equal(applied, false);
  assert.equal(w.tick, 100);
});
