/**
 * Snake WORLD host ownership — stale/ghost detection + liveness-filtered reclaim.
 *
 * Liveness: existing `mp_presence.last_heartbeat` (same table as SDK join/heartbeat).
 * Ghost roster rows without fresh presence are never reclaim candidates.
 */
import type { GameRoom } from "@game-platform/shared";
import { getMultiplayerSupabase, roomGameStateAgeMs } from "@game-platform/multiplayer-sdk";

/** Wait for a normal host to finish first bootstrap before calling stale. */
export const SNAKE_WORLD_BOOT_GRACE_MS = 4_000;

/** Fresh Broadcast `_updatedAt` / state age under this = live host. */
export const SNAKE_WORLD_LIVE_STATE_MS = 6_000;

/** Non-winners wait this long after boot grace for the reclaim winner's state. */
export const SNAKE_WORLD_RECLAIM_FOLLOW_MS = 8_000;

/** Align with mp_presence heartbeat cadence (~15s) — 3 missed beats ≈ stale. */
export const SNAKE_WORLD_PRESENCE_LIVE_MS = 45_000;

export type SnakeWorldHostHealth =
  | { kind: "self-host" }
  | { kind: "live-host"; ageMs: number }
  | { kind: "booting-host"; waitedMs: number }
  | { kind: "stale-host"; reason: string };

export function hasSnakeWorldAuthorityState(room: GameRoom | null | undefined): boolean {
  const state = room?.gameState?.state;
  return !!state && typeof state === "object";
}

/** Room-scoped presence query — existing mp_presence signal, no new polling loop. */
export async function fetchRoomPresenceLiveIds(
  roomCode: string,
  maxAgeMs = SNAKE_WORLD_PRESENCE_LIVE_MS
): Promise<string[]> {
  const supabase = getMultiplayerSupabase();
  if (!supabase) return [];
  const since = new Date(Date.now() - maxAgeMs).toISOString();
  const { data, error } = await supabase
    .from("mp_presence")
    .select("device_id")
    .eq("room_code", roomCode.toUpperCase())
    .gt("last_heartbeat", since);
  if (error || !data) return [];
  return data.map((row) => String(row.device_id));
}

/**
 * Active reclaim candidates — never roster-only ghosts.
 * - self always included (known connected client)
 * - others require fresh mp_presence for this room + roster membership
 */
export function buildSnakeWorldActiveCandidates(
  room: GameRoom,
  selfDeviceId: string,
  livePresenceIds: string[]
): string[] {
  const hostId = room.hostId;
  const rosterIds = new Set(room.players.map((p) => p.deviceId));
  const liveSet = new Set(livePresenceIds);
  const active = new Set<string>();

  if (selfDeviceId && selfDeviceId !== hostId) {
    active.add(selfDeviceId);
  }

  for (const id of liveSet) {
    if (!id || id === hostId) continue;
    if (!rosterIds.has(id)) continue;
    active.add(id);
  }

  return [...active].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Classify host health for a connected Snake WORLD client.
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

  if (waitedMs < SNAKE_WORLD_BOOT_GRACE_MS) {
    return { kind: "booting-host", waitedMs };
  }

  return { kind: "stale-host", reason: "no-state-after-grace" };
}

/**
 * Deterministic reclaim winner among **active** candidates only (never roster ghosts).
 */
export function snakeWorldReclaimWinnerId(
  room: GameRoom,
  activeCandidateIds: string[]
): string | null {
  const hostId = room.hostId;
  const candidates = activeCandidateIds.filter((id) => id && id !== hostId);
  if (candidates.length === 0) return null;
  return candidates[0] ?? null;
}

export function isSnakeWorldReclaimWinner(
  room: GameRoom,
  deviceId: string,
  activeCandidateIds: string[]
): boolean {
  const winner = snakeWorldReclaimWinnerId(room, activeCandidateIds);
  return winner != null && winner === deviceId;
}

export function snakeWorldGuestDeadlineMs(connectedAtMs: number): number {
  return connectedAtMs + SNAKE_WORLD_BOOT_GRACE_MS + SNAKE_WORLD_RECLAIM_FOLLOW_MS;
}

export function shouldFailSnakeWorldSpawn(opts: {
  health: SnakeWorldHostHealth;
  connectedAtMs: number;
  nowMs?: number;
  reclaimAttempted: boolean;
  activeCandidateCount: number;
}): boolean {
  const now = opts.nowMs ?? Date.now();
  if (opts.health.kind === "live-host" || opts.health.kind === "self-host") return false;
  if (opts.health.kind === "booting-host") return false;
  if (opts.activeCandidateCount === 0 && now < snakeWorldGuestDeadlineMs(opts.connectedAtMs)) {
    return false;
  }
  return now >= snakeWorldGuestDeadlineMs(opts.connectedAtMs);
}
