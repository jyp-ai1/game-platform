/**
 * BOMBER-ONLINE-002 — offline 2-client bomb visibility simulation (engine-level).
 * Host plants → guest upserts bomb → both explode → same death.
 * Run: node --import tsx docs/qa/bomber-online-002/sync-sim.mjs
 */
import assert from "node:assert/strict";
import {
  applyBomberSyncState,
  createBomberWorld,
  plantBomb,
  serializeBomberState,
  tickBomberWorld,
  upsertRemoteBomb,
} from "../../../games/bomber/src/bomber-engine.ts";

const matchStartedAt = 10_000;
const humans = [
  { id: "host", nickname: "Host" },
  { id: "guest", nickname: "Guest" },
];
const host = createBomberWorld("host", "Host", {
  playerSlots: 4,
  mapId: 0,
  humans,
  matchStartedAt,
});
const guest = createBomberWorld("guest", "Guest", {
  playerSlots: 4,
  mapId: 0,
  humans,
  matchStartedAt,
});

// Keep only the two humans so last-survivor resolves cleanly
for (const w of [host, guest]) {
  for (const id of Object.keys(w.players)) {
    if (id !== "host" && id !== "guest") delete w.players[id];
  }
}

// Align spawn: host at (1,1), guest stands in fire lane (2,1)
host.players.host.x = 1;
host.players.host.y = 1;
host.players.guest.x = 2;
host.players.guest.y = 1;
host.grid[1][2] = "empty";
guest.players.host.x = 1;
guest.players.host.y = 1;
guest.players.guest.x = 2;
guest.players.guest.y = 1;
guest.grid[1][2] = "empty";

const t0 = matchStartedAt + 500;
const bomb = plantBomb(host, "host", t0);
assert.ok(bomb, "host planted");

// Low-latency path: bomber:bomb event
upsertRemoteBomb(guest, bomb);
assert.equal(guest.bombs.length, 1, "guest sees bomb");
assert.equal(guest.bombs[0].id, bomb.id);

// Host steps off; guest remains on blast
host.players.host.x = 1;
host.players.host.y = 3;
host.grid[2][1] = "empty";
host.grid[3][1] = "empty";

tickBomberWorld(host, t0 + host.fuseMs + 30);
applyBomberSyncState(guest, serializeBomberState(host));

assert.equal(host.players.guest.alive, false);
assert.equal(guest.players.guest.alive, false, "same death both sides");
assert.equal(host.winnerId, "host");
assert.equal(guest.winnerId, "host");

const report = {
  task: "BOMBER-ONLINE-002",
  evidence: "sync-sim.mjs",
  bombVisibleOnGuest: true,
  explosionSynced: true,
  deathResultSame: true,
  winnerBoth: host.winnerId,
};
console.log(JSON.stringify(report, null, 2));
