/**
 * BOMBER-ONLINE-003 — 2-client same-map sync (engine-level).
 * Run: node --import tsx docs/qa/mp-mobile-bomber-003/sync-sim.mjs
 */
import assert from "node:assert/strict";
import {
  applyBomberSyncState,
  bomberRoomCodeForMap,
  createBomberWorld,
  plantBomb,
  reconcileHumans,
  rosterForMap,
  serializeBomberState,
  tickBomberWorld,
  upsertRemoteBomb,
} from "../../../games/bomber/src/bomber-engine.ts";

assert.equal(bomberRoomCodeForMap(0), "BOMBER-A");
assert.equal(rosterForMap(0), 4);
assert.equal(rosterForMap(2), 6);

const matchStartedAt = 20_000;
const humans = [
  { id: "pc-a", nickname: "PCA" },
  { id: "pc-b", nickname: "PCB" },
];
const host = createBomberWorld("pc-a", "PCA", {
  mapId: 0,
  humans,
  matchStartedAt,
});
const guest = createBomberWorld("pc-b", "PCB", {
  mapId: 0,
  humans,
  matchStartedAt,
});

for (const w of [host, guest]) {
  for (const id of Object.keys(w.players)) {
    if (id !== "pc-a" && id !== "pc-b") delete w.players[id];
  }
}

host.players["pc-a"].x = 1;
host.players["pc-a"].y = 1;
host.players["pc-b"].x = 2;
host.players["pc-b"].y = 1;
host.grid[1][2] = "empty";
guest.players["pc-a"].x = 1;
guest.players["pc-a"].y = 1;
guest.players["pc-b"].x = 2;
guest.players["pc-b"].y = 1;
guest.grid[1][2] = "empty";

const t0 = matchStartedAt + 400;
const bomb = plantBomb(host, "pc-a", t0);
assert.ok(bomb);
upsertRemoteBomb(guest, bomb);
assert.equal(guest.bombs.length, 1, "guest sees bomb");

host.players["pc-a"].x = 1;
host.players["pc-a"].y = 3;
host.grid[2][1] = "empty";
host.grid[3][1] = "empty";

tickBomberWorld(host, t0 + host.fuseMs + 40);
applyBomberSyncState(guest, serializeBomberState(host));

assert.equal(host.players["pc-b"].alive, false);
assert.equal(guest.players["pc-b"].alive, false);
assert.equal(host.winnerId, "pc-a");
assert.equal(guest.winnerId, "pc-a");

// New joiner replaces AI
const filled = createBomberWorld("solo", "Solo", { mapId: 0 });
assert.equal(Object.values(filled.players).filter((p) => p.isBot).length, 3);
reconcileHumans(filled, [
  { id: "solo", nickname: "Solo" },
  { id: "friend", nickname: "Friend" },
]);
assert.ok(filled.players.friend);
assert.equal(filled.players.friend.isBot, false);

const report = {
  task: "BOMBER-ONLINE-003",
  roomClassic: bomberRoomCodeForMap(0),
  roomMaze: bomberRoomCodeForMap(2),
  bombVisibleOnGuest: true,
  explosionSynced: true,
  deathResultSame: true,
  humanReplacesAi: true,
};
console.log(JSON.stringify(report, null, 2));
