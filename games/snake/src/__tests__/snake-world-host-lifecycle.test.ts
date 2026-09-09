/**
 * Snake WORLD host ownership safety — unit tests (CPO A–G scenarios)
 * Run: npx tsx --test games/snake/src/__tests__/snake-world-host-lifecycle.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GameRoom } from "@game-platform/shared";

import {
  buildSnakeWorldActiveCandidates,
  canBootstrapAfterReclaim,
  classifySnakeWorldHost,
  collectReclaimClaimIds,
  hasSnakeWorldAuthorityState,
  isSnakeWorldReclaimWinner,
  shouldFailSnakeWorldSpawn,
  snakeWorldGuestDeadlineMs,
  snakeWorldReclaimWinnerId,
  SNAKE_WORLD_BOOT_GRACE_MS,
  SNAKE_WORLD_LIVE_STATE_MS,
} from "../snake-world-host-lifecycle";

function room(partial: Partial<GameRoom> & Pick<GameRoom, "hostId" | "players">): GameRoom {
  return {
    code: "WORLD-6",
    gameSlug: "snake",
    maxPlayers: 50,
    spectators: [],
    status: "playing",
    countdown: 0,
    matchMode: "public",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("snake-world-host-lifecycle safety", () => {
  it("A / G: live host presence → waiting, never stale from missing state", () => {
    const t0 = 1_000_000;
    const r = room({
      hostId: "host",
      players: [
        { deviceId: "host", nickname: "H", ready: true },
        { deviceId: "guest", nickname: "G", ready: true },
      ],
    });
    const afterGrace = classifySnakeWorldHost({
      room: r,
      deviceId: "guest",
      connectedAtMs: t0,
      nowMs: t0 + SNAKE_WORLD_BOOT_GRACE_MS + 5_000,
      hostPresenceLive: true,
    });
    assert.equal(afterGrace.kind, "waiting-live-host");
    assert.equal(
      shouldFailSnakeWorldSpawn({
        health: afterGrace,
        connectedAtMs: t0,
        nowMs: snakeWorldGuestDeadlineMs(t0) + 1,
        reclaimAttempted: false,
        activeCandidateCount: 1,
      }),
      false
    );
  });

  it("A: fresh state → live-host", () => {
    const now = Date.now();
    const r = room({
      hostId: "host",
      players: [
        { deviceId: "host", nickname: "H", ready: true },
        { deviceId: "guest", nickname: "G", ready: true },
      ],
      gameState: {
        state: { tick: 10 },
        _updatedAt: new Date(now - 500).toISOString(),
      },
    });
    const h = classifySnakeWorldHost({
      room: r,
      deviceId: "guest",
      connectedAtMs: now - 1000,
      nowMs: now,
      hostPresenceLive: false,
    });
    assert.equal(h.kind, "live-host");
    if (h.kind === "live-host") assert.ok(h.ageMs <= SNAKE_WORLD_LIVE_STATE_MS);
  });

  it("B: stale host + 1 active guest → single winner", () => {
    const r = room({
      hostId: "ghost",
      players: [
        { deviceId: "ghost", nickname: "G", ready: true },
        { deviceId: "guest-a", nickname: "A", ready: true },
      ],
    });
    const active = buildSnakeWorldActiveCandidates(r, "guest-a", ["guest-a"]);
    assert.deepEqual(active, ["guest-a"]);
    assert.equal(isSnakeWorldReclaimWinner(r, "guest-a", active), true);
  });

  it("C: stale + 2 active guests → lex winner only", () => {
    const r = room({
      hostId: "ghost",
      players: [
        { deviceId: "ghost", nickname: "G", ready: true },
        { deviceId: "guest-b", nickname: "B", ready: true },
        { deviceId: "guest-a", nickname: "A", ready: true },
      ],
    });
    const active = buildSnakeWorldActiveCandidates(r, "guest-b", ["guest-a", "guest-b"]);
    assert.deepEqual(active, ["guest-a", "guest-b"]);
    assert.equal(snakeWorldReclaimWinnerId(r, active), "guest-a");
    assert.equal(isSnakeWorldReclaimWinner(r, "guest-a", active), true);
    assert.equal(isSnakeWorldReclaimWinner(r, "guest-b", active), false);
  });

  it("D: ghost-heavy MUST NOT self-only — both live guests remain candidates", () => {
    const players = Array.from({ length: 26 }, (_, i) => ({
      deviceId: `ghost-${i}`,
      nickname: `G${i}`,
      ready: true,
    }));
    players.push(
      { deviceId: "guest-a", nickname: "A", ready: true },
      { deviceId: "guest-b", nickname: "B", ready: true }
    );
    const r = room({ hostId: "ghost-0", players });
    assert.equal(hasSnakeWorldAuthorityState(r), false);
    assert.ok(r.players.length >= 10);
    const fromA = buildSnakeWorldActiveCandidates(r, "guest-a", ["guest-a", "guest-b"]);
    const fromB = buildSnakeWorldActiveCandidates(r, "guest-b", ["guest-a", "guest-b"]);
    assert.deepEqual(fromA, ["guest-a", "guest-b"]);
    assert.deepEqual(fromB, ["guest-a", "guest-b"]);
    assert.equal(snakeWorldReclaimWinnerId(r, fromA), "guest-a");
    assert.equal(isSnakeWorldReclaimWinner(r, "guest-b", fromB), false);
  });

  it("E: ghost-heavy + 1 active guest → unique candidate", () => {
    const players = Array.from({ length: 20 }, (_, i) => ({
      deviceId: `ghost-${i}`,
      nickname: `G${i}`,
      ready: true,
    }));
    players.push({ deviceId: "solo", nickname: "S", ready: true });
    const r = room({ hostId: "ghost-0", players });
    const active = buildSnakeWorldActiveCandidates(r, "solo", ["solo"]);
    assert.deepEqual(active, ["solo"]);
  });

  it("F: ghost-only → zero candidates without includeSelf", () => {
    const r = room({
      hostId: "ghost",
      players: Array.from({ length: 15 }, (_, i) => ({
        deviceId: `ghost-${i}`,
        nickname: `G${i}`,
        ready: true,
      })),
    });
    const active = buildSnakeWorldActiveCandidates(r, "joiner", []);
    assert.deepEqual(active, []);
    assert.equal(snakeWorldReclaimWinnerId(r, active), null);
  });

  it("F: includeSelfIfConnected only after stale path — still single self", () => {
    const r = room({
      hostId: "ghost",
      players: [{ deviceId: "ghost", nickname: "G", ready: true }],
    });
    const active = buildSnakeWorldActiveCandidates(r, "joiner", [], {
      includeSelfIfConnected: true,
    });
    assert.deepEqual(active, ["joiner"]);
  });

  it("stale requires dead host presence after grace", () => {
    const t0 = 2_000_000;
    const r = room({
      hostId: "ghost",
      players: [
        { deviceId: "ghost", nickname: "G", ready: true },
        { deviceId: "guest", nickname: "V", ready: true },
      ],
    });
    const booting = classifySnakeWorldHost({
      room: r,
      deviceId: "guest",
      connectedAtMs: t0,
      nowMs: t0 + 100,
      hostPresenceLive: false,
    });
    assert.equal(booting.kind, "booting-host");
    const stale = classifySnakeWorldHost({
      room: r,
      deviceId: "guest",
      connectedAtMs: t0,
      nowMs: t0 + SNAKE_WORLD_BOOT_GRACE_MS + 1,
      hostPresenceLive: false,
    });
    assert.equal(stale.kind, "stale-host");
  });

  it("canBootstrapAfterReclaim requires hostId match", () => {
    const r = room({
      hostId: "winner",
      players: [{ deviceId: "winner", nickname: "W", ready: true }],
    });
    assert.equal(canBootstrapAfterReclaim(r, "winner"), true);
    assert.equal(canBootstrapAfterReclaim(r, "loser"), false);
    assert.equal(canBootstrapAfterReclaim(null, "winner"), false);
  });

  it("collectReclaimClaimIds prefers Broadcast claims over fallback", () => {
    const r = room({
      hostId: "ghost",
      players: [
        { deviceId: "ghost", nickname: "G", ready: true },
        { deviceId: "zzz", nickname: "Z", ready: true },
        { deviceId: "aaa", nickname: "A", ready: true },
      ],
      gameState: {
        "snake:reclaim-claim:zzz": { deviceId: "zzz", at: 1 },
        "snake:reclaim-claim:aaa": { deviceId: "aaa", at: 2 },
      },
    });
    const ids = collectReclaimClaimIds(r, ["zzz"]);
    assert.deepEqual(ids, ["aaa", "zzz"]);
    assert.equal(ids[0], "aaa");
  });

  it("roster ghosts without presence never become candidates", () => {
    const r = room({
      hostId: "h",
      players: [
        { deviceId: "h", nickname: "H", ready: true },
        { deviceId: "ghost-a", nickname: "A", ready: true },
        { deviceId: "live", nickname: "L", ready: true },
      ],
    });
    const active = buildSnakeWorldActiveCandidates(r, "live", ["live"]);
    assert.deepEqual(active, ["live"]);
    assert.equal(isSnakeWorldReclaimWinner(r, "ghost-a", active), false);
  });
});
