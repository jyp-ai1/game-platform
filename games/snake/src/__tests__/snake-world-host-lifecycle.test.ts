/**
 * Snake WORLD host lifecycle unit tests
 * Run: npx tsx --test games/snake/src/__tests__/snake-world-host-lifecycle.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GameRoom } from "@game-platform/shared";

import {
  buildSnakeWorldActiveCandidates,
  classifySnakeWorldHost,
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

describe("snake-world-host-lifecycle", () => {
  it("hasSnakeWorldAuthorityState requires gameState.state", () => {
    assert.equal(hasSnakeWorldAuthorityState(room({ hostId: "h", players: [] })), false);
    assert.equal(
      hasSnakeWorldAuthorityState(
        room({
          hostId: "h",
          players: [],
          gameState: { state: { tick: 1 }, _updatedAt: new Date().toISOString() },
        })
      ),
      true
    );
  });

  it("buildSnakeWorldActiveCandidates excludes roster ghosts without presence", () => {
    const r = room({
      hostId: "ghost-host",
      players: [
        { deviceId: "ghost-host", nickname: "H", ready: true },
        { deviceId: "ghost-a", nickname: "A", ready: true },
        { deviceId: "ghost-b", nickname: "B", ready: true },
        { deviceId: "live-guest", nickname: "G", ready: true },
      ],
    });
    const active = buildSnakeWorldActiveCandidates(r, "live-guest", ["live-guest"]);
    assert.deepEqual(active, ["live-guest"]);
    assert.equal(isSnakeWorldReclaimWinner(r, "ghost-a", active), false);
    assert.equal(isSnakeWorldReclaimWinner(r, "live-guest", active), true);
  });

  it("buildSnakeWorldActiveCandidates — two live guests, lex winner", () => {
    const r = room({
      hostId: "ghost-host",
      players: [
        { deviceId: "ghost-host", nickname: "H", ready: true },
        { deviceId: "guest-b", nickname: "B", ready: true },
        { deviceId: "guest-a", nickname: "A", ready: true },
      ],
    });
    const live = ["guest-a", "guest-b"];
    const active = buildSnakeWorldActiveCandidates(r, "guest-b", live);
    assert.deepEqual(active, ["guest-a", "guest-b"]);
    assert.equal(snakeWorldReclaimWinnerId(r, active), "guest-a");
    assert.equal(isSnakeWorldReclaimWinner(r, "guest-a", active), true);
    assert.equal(isSnakeWorldReclaimWinner(r, "guest-b", active), false);
  });

  it("ghost-heavy WORLD roster — only self is reclaim candidate", () => {
    const r = room({
      hostId: "zzz-ghost",
      players: Array.from({ length: 26 }, (_, i) => ({
        deviceId: `ghost-${i}`,
        nickname: `G${i}`,
        ready: true,
      })),
    });
    const active = buildSnakeWorldActiveCandidates(r, "real-joiner", [
      "ghost-0",
      "ghost-1",
      "real-joiner",
    ]);
    assert.deepEqual(active, ["real-joiner"]);
    assert.equal(snakeWorldReclaimWinnerId(r, active), "real-joiner");
  });

  it("zero active when self is listed host", () => {
    const r = room({
      hostId: "me",
      players: [{ deviceId: "me", nickname: "Me", ready: true }],
    });
    const active = buildSnakeWorldActiveCandidates(r, "me", ["me"]);
    assert.deepEqual(active, []);
    assert.equal(snakeWorldReclaimWinnerId(r, active), null);
  });

  it("classify — after grace, stale without state even if host presence exists in DB", () => {
    const t0 = 1_000_000;
    const r = room({
      hostId: "host",
      players: [
        { deviceId: "host", nickname: "H", ready: true },
        { deviceId: "guest", nickname: "G", ready: true },
      ],
    });
    const h = classifySnakeWorldHost({
      room: r,
      deviceId: "guest",
      connectedAtMs: t0,
      nowMs: t0 + SNAKE_WORLD_BOOT_GRACE_MS + 500,
    });
    assert.equal(h.kind, "stale-host");
  });

  it("classify — stale after grace when host presence dead", () => {
    const t0 = 1_000_000;
    const r = room({
      hostId: "ghost",
      players: [
        { deviceId: "ghost", nickname: "G", ready: true },
        { deviceId: "guest", nickname: "V", ready: true },
      ],
    });
    const h = classifySnakeWorldHost({
      room: r,
      deviceId: "guest",
      connectedAtMs: t0,
      nowMs: t0 + SNAKE_WORLD_BOOT_GRACE_MS + 1,
    });
    assert.equal(h.kind, "stale-host");
  });

  it("classify — live host when fresh state", () => {
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
    });
    assert.equal(h.kind, "live-host");
    if (h.kind === "live-host") assert.ok(h.ageMs <= SNAKE_WORLD_LIVE_STATE_MS);
  });

  it("shouldFail waits when zero active candidates before deadline", () => {
    const t0 = 5_000_000;
    const health = { kind: "stale-host" as const, reason: "no-state-after-grace" };
    assert.equal(
      shouldFailSnakeWorldSpawn({
        health,
        connectedAtMs: t0,
        nowMs: t0 + SNAKE_WORLD_BOOT_GRACE_MS + 100,
        reclaimAttempted: false,
        activeCandidateCount: 0,
      }),
      false
    );
    assert.equal(
      shouldFailSnakeWorldSpawn({
        health,
        connectedAtMs: t0,
        nowMs: snakeWorldGuestDeadlineMs(t0),
        reclaimAttempted: false,
        activeCandidateCount: 0,
      }),
      true
    );
  });
});
