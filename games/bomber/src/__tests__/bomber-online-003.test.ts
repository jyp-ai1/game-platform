import assert from "node:assert/strict";
import test from "node:test";

import {
  MAP_LETTERS,
  MAP_NAMES,
  MAP_ROSTER,
  MATCH_AI,
  applyBomberSyncState,
  bomberRoomCodeForMap,
  createBomberWorld,
  plantBomb,
  reconcileHumans,
  rosterForMap,
  serializeBomberState,
  tickBomberWorld,
} from "../bomber-engine";

test("ONLINE-003: map determines roster (no picker)", () => {
  assert.deepEqual([...MAP_ROSTER], [4, 4, 6, 6]);
  assert.equal(rosterForMap(0), 4);
  assert.equal(rosterForMap(1), 4);
  assert.equal(rosterForMap(2), 6);
  assert.equal(rosterForMap(3), 6);

  const classic = createBomberWorld("local", "You", { mapId: 0 });
  assert.equal(classic.playerSlots, 4);
  assert.equal(Object.keys(classic.players).length, 4);

  const maze = createBomberWorld("local", "You", { mapId: 2 });
  assert.equal(maze.playerSlots, 6);
  assert.equal(Object.keys(maze.players).length, 6);
});

test("ONLINE-003: same map = same room code", () => {
  assert.equal(bomberRoomCodeForMap(0), "BOMBER-A");
  assert.equal(bomberRoomCodeForMap(1), "BOMBER-B");
  assert.equal(bomberRoomCodeForMap(2), "BOMBER-C");
  assert.equal(bomberRoomCodeForMap(3), "BOMBER-D");
  assert.deepEqual(
    MAP_NAMES.map((_, i) => bomberRoomCodeForMap(i)),
    MAP_LETTERS.map((L) => `BOMBER-${L}`)
  );
});

test("ONLINE-003: AI harder than old Normal and moves/plants", () => {
  assert.ok(MATCH_AI.aiTickEvery < 8);
  assert.ok(MATCH_AI.aiBombChance > 0.032);
  assert.ok(MATCH_AI.aiHuntChance > 0.42);

  const w = createBomberWorld("local", "You", { mapId: 0 });
  // Open arena so AI can walk
  for (let y = 1; y < w.rows - 1; y++) {
    for (let x = 1; x < w.cols - 1; x++) {
      w.grid[y]![x] = "empty";
    }
  }
  w.bombs = [];
  w.blasts = [];
  const bot = Object.values(w.players).find((p) => p.isBot)!;
  bot.x = 5;
  bot.y = 5;
  const start = { x: bot.x, y: bot.y };
  let moved = false;
  const t0 = w.matchStartedAt + 100;
  for (let i = 0; i < 80; i++) {
    tickBomberWorld(w, t0 + i * 50);
    const b = w.players[bot.id];
    if (b && (b.x !== start.x || b.y !== start.y)) {
      moved = true;
      break;
    }
  }
  assert.equal(moved, true, "AI must move within ticks");
});

test("ONLINE-003: bomb fuse explodes + soft destroy + death", () => {
  const w = createBomberWorld("local", "You", { mapId: 0 });
  for (const id of Object.keys(w.players)) {
    if (id !== "local") delete w.players[id];
  }
  w.players.victim = {
    id: "victim",
    nickname: "Victim",
    color: "#f00",
    x: 2,
    y: 1,
    alive: true,
    isBot: true,
    bombsMax: 1,
    bombsLeft: 1,
    kills: 0,
    wins: 0,
  };
  w.players.local!.x = 1;
  w.players.local!.y = 1;
  w.grid[1]![2] = "empty";
  // Soft adjacent in blast range (fire start = 1)
  w.grid[1]![3] = "hard";
  w.grid[0]![1] = "hard";
  w.grid[2]![1] = "soft";

  const t0 = w.matchStartedAt + 200;
  const bomb = plantBomb(w, "local", t0);
  assert.ok(bomb);
  w.players.local!.x = 3;
  w.players.local!.y = 1;
  w.grid[1]![3] = "empty";

  tickBomberWorld(w, t0 + w.fuseMs + 20);
  assert.equal(w.bombs.length, 0, "bomb exploded");
  assert.equal(w.players.victim!.alive, false, "victim dies");
  assert.equal(w.grid[2]![1], "empty", "soft destroyed");
});

test("ONLINE-003: host→guest state sync same explosion/death", () => {
  const humans = [
    { id: "host", nickname: "Host" },
    { id: "guest", nickname: "Guest" },
  ];
  const host = createBomberWorld("host", "Host", { mapId: 0, humans });
  const guest = createBomberWorld("guest", "Guest", { mapId: 0, humans });
  for (const w of [host, guest]) {
    for (const id of Object.keys(w.players)) {
      if (id !== "host" && id !== "guest") delete w.players[id];
    }
  }
  host.players.host!.x = 1;
  host.players.host!.y = 1;
  host.players.guest!.x = 2;
  host.players.guest!.y = 1;
  host.grid[1]![2] = "empty";
  guest.players.host!.x = 1;
  guest.players.host!.y = 1;
  guest.players.guest!.x = 2;
  guest.players.guest!.y = 1;
  guest.grid[1]![2] = "empty";

  const t0 = host.matchStartedAt + 500;
  plantBomb(host, "host", t0);
  host.players.host!.x = 1;
  host.players.host!.y = 3;
  host.grid[2]![1] = "empty";
  host.grid[3]![1] = "empty";
  tickBomberWorld(host, t0 + host.fuseMs + 30);
  applyBomberSyncState(guest, serializeBomberState(host));

  assert.equal(host.players.guest!.alive, false);
  assert.equal(guest.players.guest!.alive, false);
  assert.equal(host.winnerId, "host");
  assert.equal(guest.winnerId, "host");
});

test("ONLINE-003: new human replaces AI; leaver → AI refill", () => {
  const w = createBomberWorld("a", "A", { mapId: 0, humans: [{ id: "a", nickname: "A" }] });
  assert.equal(Object.values(w.players).filter((p) => p.isBot).length, 3);

  reconcileHumans(w, [
    { id: "a", nickname: "A" },
    { id: "b", nickname: "B" },
  ]);
  assert.ok(w.players.b);
  assert.equal(w.players.b!.isBot, false);
  assert.equal(Object.keys(w.players).length, 4);

  reconcileHumans(w, [{ id: "a", nickname: "A" }]);
  assert.equal(w.players.b, undefined);
  assert.equal(Object.values(w.players).filter((p) => p.isBot).length, 3);
  assert.equal(Object.keys(w.players).length, 4);
});
