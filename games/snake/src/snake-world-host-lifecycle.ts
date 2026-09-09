/**
 * Snake WORLD host ownership — stale/ghost detection + deterministic reclaim winner.
 *
 * Rules (CPO):
 * - Guests never invent a local authoritative world on their own.
 * - At most one reclaim winner per room (lexicographic deviceId among non-host members).
 * - Booting hosts get a grace window before stale classification.
 * - Does not touch common transport / Phase 2 Broadcast-only frames.
 */
import type { GameRoom } from "@game-platform/shared";
import { roomGameStateAgeMs } from "@game-platform/multiplayer-sdk";

/** Wait for a normal host to finish first bootstrap before calling stale. */
export const SNAKE_WORLD_BOOT_GRACE_MS = 4_000;

/** Fresh Broadcast `_updatedAt` / state age under this = live host. */
export const SNAKE_WORLD_LIVE_STATE_MS = 6_000;

/** Non-winners wait this long after boot grace for the reclaim winner's state. */
export const SNAKE_WORLD_RECLAIM_FOLLOW_MS = 8_000;

export type SnakeWorldHostHealth =
  | { kind: "self-host" }
  | { kind: "live-host"; ageMs: number }
  | { kind: "booting-host"; waitedMs: number }
  | { kind: "stale-host"; reason: string };

export function hasSnakeWorldAuthorityState(room: GameRoom | null | undefined): boolean {
  const state = room?.gameState?.state;
  return !!state && typeof state === "object";
}

/**
 * Classify host health for a connected Snake WORLD client.
 * `connectedAtMs` = local finishConnect timestamp.
 */
export function classifySnakeWorldHost(opts: {
  room: GameRoom | null | undefined;
  deviceId: string;
  connectedAtMs: number;
  nowMs?: number;
}): SnakeWorldHostHealth {
  const now = opts.nowMs ?? Date.now();
  const waitedMs = Math.max(0, now - opts.connectedAtMs);
  const room = opts.room;

  if (!room) {
    return waitedMs < SNAKE_WORLD_BOOT_GRACE_MS
      ? { kind: "booting-host", waitedMs }
      : { kind: "stale-host", reason: "room-missing" };
  }

  if (room.hostId === opts.deviceId) {
    return { kind: "self-host" };
  }

  if (hasSnakeWorldAuthorityState(room)) {
    const ageMs = roomGameStateAgeMs(room);
    if (ageMs <= SNAKE_WORLD_LIVE_STATE_MS) {
      return { kind: "live-host", ageMs };
    }
    return { kind: "stale-host", reason: `state-stale:${Math.round(ageMs)}ms` };
  }

  // No authoritative state yet — allow boot grace for a real host spinning up.
  if (waitedMs < SNAKE_WORLD_BOOT_GRACE_MS) {
    return { kind: "booting-host", waitedMs };
  }

  return { kind: "stale-host", reason: "no-state-after-grace" };
}

/**
 * Deterministic reclaim winner among current members excluding the listed (stale) host.
 * Lexicographically smallest deviceId wins. Empty → null.
 */
export function snakeWorldReclaimWinnerId(room: GameRoom): string | null {
  const hostId = room.hostId;
  const candidates = room.players
    .map((p) => p.deviceId)
    .filter((id) => id && id !== hostId)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return candidates[0] ?? null;
}

export function isSnakeWorldReclaimWinner(room: GameRoom, deviceId: string): boolean {
  const winner = snakeWorldReclaimWinnerId(room);
  return winner != null && winner === deviceId;
}

/** Absolute deadline for non-winner follow / final fail (boot grace + follow). */
export function snakeWorldGuestDeadlineMs(connectedAtMs: number): number {
  return connectedAtMs + SNAKE_WORLD_BOOT_GRACE_MS + SNAKE_WORLD_RECLAIM_FOLLOW_MS;
}

export function shouldFailSnakeWorldSpawn(opts: {
  health: SnakeWorldHostHealth;
  connectedAtMs: number;
  nowMs?: number;
  reclaimAttempted: boolean;
}): boolean {
  const now = opts.nowMs ?? Date.now();
  if (opts.health.kind === "live-host" || opts.health.kind === "self-host") return false;
  if (opts.health.kind === "booting-host") return false;
  // stale: winners get reclaim attempt; everyone fails after follow window
  return now >= snakeWorldGuestDeadlineMs(opts.connectedAtMs);
}
