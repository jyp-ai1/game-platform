/**
 * Snake WORLD host lifecycle unit tests
 * Run: npx tsx --test games/snake/src/__tests__/snake-world-host-lifecycle.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GameRoom } from "@game-platform/shared";

import {
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

  it("classify — self-host", () => {
    const r = room({
      hostId: "me",
      players: [{ deviceId: "me", nickname: "Me", ready: true }],
    });
    assert.equal(
      classifySnakeWorldHost({ room: r, deviceId: "me", connectedAtMs: Date.now() }).kind,
      "self-host"
    );
  });

  it("classify — booting within grace when no state", () => {
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
      nowMs: t0 + SNAKE_WORLD_BOOT_GRACE_MS - 1,
    });
    assert.equal(h.kind, "booting-host");
  });

  it("classify — stale after grace with no state", () => {
    const t0 = 1_000_000;
    const r = room({
      hostId: "ghost",
      players: [
        { deviceId: "ghost", nickname: "Ghost", ready: true },
        { deviceId: "a", nickname: "A", ready: true },
        { deviceId: "b", nickname: "B", ready: true },
      ],
    });
    const h = classifySnakeWorldHost({
      room: r,
      deviceId: "a",
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

  it("reclaim winner is lexicographic min excluding listed host", () => {
    const r = room({
      hostId: "zzz-ghost",
      players: [
        { deviceId: "zzz-ghost", nickname: "G", ready: true },
        { deviceId: "ddd", nickname: "D", ready: true },
        { deviceId: "aaa", nickname: "A", ready: true },
        { deviceId: "mmm", nickname: "M", ready: true },
      ],
    });
    assert.equal(snakeWorldReclaimWinnerId(r), "aaa");
    assert.equal(isSnakeWorldReclaimWinner(r, "aaa"), true);
    assert.equal(isSnakeWorldReclaimWinner(r, "ddd"), false);
    assert.equal(isSnakeWorldReclaimWinner(r, "zzz-ghost"), false);
  });

  it("two guests — only one deterministic winner", () => {
    const r = room({
      hostId: "host",
      players: [
        { deviceId: "host", nickname: "H", ready: true },
        { deviceId: "guest-b", nickname: "B", ready: true },
        { deviceId: "guest-a", nickname: "A", ready: true },
      ],
    });
    assert.equal(snakeWorldReclaimWinnerId(r), "guest-a");
  });

  it("shouldFail only after follow deadline while stale", () => {
    const t0 = 5_000_000;
    const health = { kind: "stale-host" as const, reason: "no-state-after-grace" };
    assert.equal(
      shouldFailSnakeWorldSpawn({
        health,
        connectedAtMs: t0,
        nowMs: t0 + SNAKE_WORLD_BOOT_GRACE_MS + 100,
        reclaimAttempted: true,
      }),
      false
    );
    assert.equal(
      shouldFailSnakeWorldSpawn({
        health,
        connectedAtMs: t0,
        nowMs: snakeWorldGuestDeadlineMs(t0),
        reclaimAttempted: true,
      }),
      true
    );
  });
});
