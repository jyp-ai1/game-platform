/**
 * Snake WORLD host ownership — presence-gated reclaim (no self-only / no state-only stale).
 *
 * CPO rules:
 * - Never self-only reclaim on ghost-heavy roster
 * - Host presence fresh ⇒ reclaim forbidden (state delay ≠ dead host)
 * - Stale = host presence dead/missing AND authority state missing/stale
 * - Reclaim winner = active presence ∩ roster (excl. host), lex min; claim before bootstrap
 */
import type { GameRoom } from "@game-platform/shared";
import { getMultiplayerSupabase, roomGameStateAgeMs } from "@game-platform/multiplayer-sdk";

/** Spawn wait before treating missing state as possibly stale (not host-death proof alone). */
export const SNAKE_WORLD_BOOT_GRACE_MS = 4_000;

/** Fresh Broadcast `_updatedAt` / state age under this = live sim. */
export const SNAKE_WORLD_LIVE_STATE_MS = 6_000;

/** Wait after grace for winner state / reclaim follow. */
export const SNAKE_WORLD_RECLAIM_FOLLOW_MS = 10_000;

/** Align with mp_presence heartbeat (~15s). */
export const SNAKE_WORLD_PRESENCE_LIVE_MS = 45_000;

/** After stale, wait so peers' presence upserts are visible before picking winner. */
export const SNAKE_WORLD_RECLAIM_COORD_MS = 700;

/** Confirm claim still holds before delete/create. */
export const SNAKE_WORLD_CLAIM_CONFIRM_MS = 350;

export type SnakeWorldHostHealth =
  | { kind: "self-host" }
  | { kind: "live-host"; ageMs: number }
  | { kind: "waiting-live-host"; reason: string }
  | { kind: "booting-host"; waitedMs: number }
  | { kind: "stale-host"; reason: string };

export function hasSnakeWorldAuthorityState(room: GameRoom | null | undefined): boolean {
  const state = room?.gameState?.state;
  return !!state && typeof state === "object";
}

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
  return [...new Set(data.map((row) => String(row.device_id)))];
}

/** Ensure local client has fresh presence so peers can see us as a candidate. */
export async function touchSnakeWorldPresence(
  roomCode: string,
  deviceId: string,
  nickname: string
): Promise<void> {
  const supabase = getMultiplayerSupabase();
  if (!supabase) return;
  await supabase.from("mp_presence").upsert({
    device_id: deviceId,
    nickname,
    status: "playing",
    game_slug: "snake",
    room_code: roomCode.toUpperCase(),
    since: new Date().toISOString(),
    spectatable: true,
    last_heartbeat: new Date().toISOString(),
  });
}

/**
 * Active reclaim candidates from presence ∩ roster only.
 * Self is included only when present in livePresenceIds (or explicitly passed as known-live).
 * No ghost-heavy self-only shortcut.
 */
export function buildSnakeWorldActiveCandidates(
  room: GameRoom,
  selfDeviceId: string,
  livePresenceIds: string[],
  opts?: { includeSelfIfConnected?: boolean }
): string[] {
  const hostId = room.hostId;
  const rosterIds = new Set(room.players.map((p) => p.deviceId));
  const liveSet = new Set(livePresenceIds);
  const active = new Set<string>();

  for (const id of liveSet) {
    if (!id || id === hostId) continue;
    if (!rosterIds.has(id) && id !== selfDeviceId) continue;
    // Self may have just joined and not yet in roster snapshot — still allow if live.
    if (id === selfDeviceId || rosterIds.has(id)) active.add(id);
  }

  // Known-connected local client: include after touchSnakeWorldPresence; before first
  // presence round-trip, includeSelfIfConnected avoids zero-candidate flicker only when
  // host is already confirmed stale (caller sets true).
  if (
    opts?.includeSelfIfConnected &&
    selfDeviceId &&
    selfDeviceId !== hostId &&
    !active.has(selfDeviceId)
  ) {
    active.add(selfDeviceId);
  }

  return [...active].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Host health — presence-aware.
 * Fresh host presence ⇒ never stale from missing/delayed state alone.
 */
export function classifySnakeWorldHost(opts: {
  room: GameRoom | null | undefined;
  deviceId: string;
  connectedAtMs: number;
  nowMs?: number;
  /** Listed host has fresh mp_presence for this room_code. */
  hostPresenceLive: boolean;
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
    // Stale blob but host still heartbeating — wait, do not reclaim.
    if (opts.hostPresenceLive) {
      return { kind: "waiting-live-host", reason: `state-stale-host-live:${Math.round(ageMs)}ms` };
    }
    return { kind: "stale-host", reason: `state-stale:${Math.round(ageMs)}ms` };
  }

  // No authority state.
  if (opts.hostPresenceLive) {
    return { kind: "waiting-live-host", reason: "host-presence-fresh-await-state" };
  }

  if (waitedMs < SNAKE_WORLD_BOOT_GRACE_MS) {
    return { kind: "booting-host", waitedMs };
  }

  // Host presence dead/missing AND no state → stale (grace only gates how soon we decide).
  return { kind: "stale-host", reason: "host-presence-dead-no-state" };
}

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
  // Live host present — keep waiting (do not fail on spawn deadline alone).
  if (opts.health.kind === "waiting-live-host") return false;
  if (opts.health.kind === "booting-host") return false;
  if (opts.activeCandidateCount === 0 && now < snakeWorldGuestDeadlineMs(opts.connectedAtMs)) {
    return false;
  }
  return now >= snakeWorldGuestDeadlineMs(opts.connectedAtMs);
}

/**
 * Atomic reclaim claim: conditional UPDATE host_id while still stale host.
 * Only one client wins the Postgres row update — losers must not bootstrap.
 */
export async function tryAtomicSnakeWorldHostClaim(opts: {
  roomCode: string;
  staleHostId: string;
  deviceId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = getMultiplayerSupabase();
  if (!supabase) {
    return { ok: true };
  }
  const code = opts.roomCode.toUpperCase();
  const { data, error } = await supabase
    .from("mp_rooms")
    .update({
      host_id: opts.deviceId,
      updated_at: new Date().toISOString(),
    })
    .eq("code", code)
    .eq("host_id", opts.staleHostId)
    .select("code, host_id");

  if (error) {
    return { ok: false, reason: `claim-error:${error.message}` };
  }
  if (!data?.length || data[0]?.host_id !== opts.deviceId) {
    return { ok: false, reason: "claim-lost-atomic" };
  }
  return { ok: true };
}

/**
 * Soft lex coord + hard atomic host_id claim. Losers must not reclaim/bootstrap.
 */
export async function tryClaimSnakeWorldReclaim(opts: {
  room: GameRoom;
  deviceId: string;
  nickname: string;
  sendClaim: (roomCode: string, event: string, payload: unknown) => void;
  readRoom: (roomCode: string) => GameRoom | null;
}): Promise<{ ok: true; candidates: string[] } | { ok: false; reason: string; candidates: string[] }> {
  const code = opts.room.code.toUpperCase();
  const staleHostId = opts.room.hostId;
  await touchSnakeWorldPresence(code, opts.deviceId, opts.nickname);
  opts.sendClaim(code, `snake:reclaim-claim:${opts.deviceId}`, {
    deviceId: opts.deviceId,
    at: Date.now(),
  });

  await sleep(SNAKE_WORLD_RECLAIM_COORD_MS);

  let live = await fetchRoomPresenceLiveIds(code);
  let candidates = buildSnakeWorldActiveCandidates(opts.room, opts.deviceId, live, {
    includeSelfIfConnected: true,
  });

  const claimIds = collectReclaimClaimIds(opts.readRoom(code), candidates).filter(
    (id) => candidates.includes(id) || id === opts.deviceId
  );
  const softWinner = claimIds[0] ?? snakeWorldReclaimWinnerId(opts.room, candidates);

  if (!softWinner || softWinner !== opts.deviceId) {
    return {
      ok: false,
      reason: "not-lex-winner",
      candidates: claimIds.length ? claimIds : candidates,
    };
  }

  await sleep(SNAKE_WORLD_CLAIM_CONFIRM_MS);

  live = await fetchRoomPresenceLiveIds(code);
  candidates = buildSnakeWorldActiveCandidates(opts.room, opts.deviceId, live, {
    includeSelfIfConnected: true,
  });
  const claimIds2 = collectReclaimClaimIds(opts.readRoom(code), candidates).filter(
    (id) => candidates.includes(id) || id === opts.deviceId
  );
  const softWinner2 = claimIds2[0] ?? snakeWorldReclaimWinnerId(opts.room, candidates);
  if (!softWinner2 || softWinner2 !== opts.deviceId) {
    return {
      ok: false,
      reason: "lost-claim-confirm",
      candidates: claimIds2.length ? claimIds2 : candidates,
    };
  }

  const atomic = await tryAtomicSnakeWorldHostClaim({
    roomCode: code,
    staleHostId,
    deviceId: opts.deviceId,
  });
  if (!atomic.ok) {
    return {
      ok: false,
      reason: atomic.reason,
      candidates: claimIds2.length ? claimIds2 : candidates,
    };
  }

  return { ok: true, candidates: claimIds2.length ? claimIds2 : candidates };
}

/** Collect reclaim claim deviceIds from Broadcast gameState keys. */
export function collectReclaimClaimIds(
  room: GameRoom | null | undefined,
  fallbackCandidates: string[]
): string[] {
  const gs = room?.gameState ?? {};
  const fromClaims: string[] = [];
  for (const key of Object.keys(gs)) {
    if (!key.startsWith("snake:reclaim-claim:")) continue;
    const payload = gs[key] as { deviceId?: string } | undefined;
    const id = payload?.deviceId ?? key.slice("snake:reclaim-claim:".length);
    if (id) fromClaims.push(id);
  }
  const merged = fromClaims.length > 0 ? fromClaims : fallbackCandidates;
  return [...new Set(merged)].filter(Boolean).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** After reclaim, only bootstrap if we own hostId. */
export function canBootstrapAfterReclaim(room: GameRoom | null | undefined, deviceId: string): boolean {
  return !!room && room.hostId === deviceId;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
