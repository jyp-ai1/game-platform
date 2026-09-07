/**
 * Multiplayer Common Contract — shared room lifecycle (Snake-aligned).
 *
 * Flow:
 *   resolve room → join → host? → guest + live host? → join : stale reclaim → new host
 *   join failure → explicit error (no disguised solo fallback)
 */
import { getDeviceId, getLastNickname } from "@game-platform/game-sdk";
import type { GameRoom, MaxPlayers } from "@game-platform/shared";

import { resolveAvailableCluster } from "./global-world";
import {
  createRoom,
  deleteMultiplayerRoom,
  ensureRoom,
  getRoom,
  joinRoom,
  joinRoomAsync,
} from "./room-client";

export type MultiplayerFlagshipSlug = "snake" | "agar" | "bomber" | "re-front";

export type MultiplayerEntryRole = "host" | "guest";

export type MultiplayerEntrySuccess = {
  ok: true;
  room: GameRoom;
  roomCode: string;
  role: MultiplayerEntryRole;
  /** True when ghost/stale host was replaced — new MP host, not solo disguise. */
  reclaimed: boolean;
};

export type MultiplayerEntryFailure = {
  ok: false;
  roomCode: string;
  error: "join_failed" | "host_unavailable";
  message: string;
};

export type MultiplayerEntryResult = MultiplayerEntrySuccess | MultiplayerEntryFailure;

/** Canonical default WORLD/shard codes — keep in sync with apps/web/lib/game-catalog.ts */
export const DEFAULT_ROOM_BY_SLUG: Record<MultiplayerFlagshipSlug, string> = {
  snake: "WORLD",
  agar: "WORLD",
  bomber: "BOMBER-A",
  "re-front": "RF-LOBBY",
};

export function resolveDefaultRoomCode(gameSlug: string): string {
  const slug = gameSlug as MultiplayerFlagshipSlug;
  return DEFAULT_ROOM_BY_SLUG[slug] ?? `${gameSlug.toUpperCase()}-LOBBY`;
}

export function resolveRoomCodeFromLocation(
  gameSlug: string,
  search?: URLSearchParams | null
): string {
  if (typeof window === "undefined" && !search) {
    return resolveDefaultRoomCode(gameSlug);
  }
  const params = search ?? new URLSearchParams(window.location.search);
  const raw = params.get("room") ?? params.get("invite");
  const code = raw?.trim().toUpperCase();
  return code && code.length > 0 ? code : resolveDefaultRoomCode(gameSlug);
}

/** Age of last room gameState update — Infinity when missing. */
export function roomGameStateAgeMs(room: GameRoom): number {
  const updatedAt = room.gameState?._updatedAt;
  if (!updatedAt) return Number.POSITIVE_INFINITY;
  const ts = new Date(String(updatedAt)).getTime();
  return Number.isFinite(ts) ? Date.now() - ts : Number.POSITIVE_INFINITY;
}

/** Listed host device is still in the room roster (not a ghost shard). */
export function isListedHostPresent(room: GameRoom): boolean {
  const hostId = room.hostId;
  if (!hostId) return false;
  return room.players.some((p) => p.deviceId === hostId);
}

/** Reset stale shard — entering device becomes authoritative MP host (sync/local). */
export function reclaimStaleMultiplayerRoom(
  room: GameRoom,
  nickname: string,
  gameSlug: string
): GameRoom {
  return createRoom({
    code: room.code,
    gameSlug,
    maxPlayers: room.maxPlayers ?? 8,
    matchMode: room.matchMode ?? "public",
    hostNickname: nickname,
  });
}

/** Delete Supabase row + create fresh MP host — use for ghost/stale shard reclaim. */
export async function reclaimStaleMultiplayerRoomAsync(
  room: GameRoom,
  nickname: string,
  gameSlug: string
): Promise<GameRoom> {
  const code = room.code.toUpperCase();
  await deleteMultiplayerRoom(code);
  // Brief pause so fetchRoomFromSupabase does not resurrect deleted row.
  await sleep(150);
  return createRoom({
    code,
    gameSlug,
    maxPlayers: room.maxPlayers ?? 8,
    matchMode: room.matchMode ?? "public",
    hostNickname: nickname,
  });
}

export type ResolveMultiplayerEntryOptions = {
  gameSlug: string;
  roomCode?: string;
  nickname?: string;
  maxPlayers?: MaxPlayers;
  searchParams?: URLSearchParams | null;
  /** Snake/Agar WORLD — pick available cluster before join. */
  resolveGlobalCluster?: boolean;
  joinRetries?: number;
  joinRetryDelayMs?: number;
  /** When guest and listed host missing — reclaim shard (explicit MP host). */
  allowStaleReclaim?: boolean;
  /** Game-specific: stale/ghost host — reclaim immediately (not booting host). */
  isGhostHost?: (room: GameRoom) => boolean;
  /** Game-specific: confirmed live host (fresh sim / presence). */
  isLiveHost?: (room: GameRoom) => boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveRoomCode(opts: ResolveMultiplayerEntryOptions): Promise<string> {
  let code = (opts.roomCode ?? resolveRoomCodeFromLocation(opts.gameSlug, opts.searchParams)).toUpperCase();
  const params =
    opts.searchParams ??
    (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null);
  const explicitInvite = params?.get("room") ?? params?.get("invite");
  if (
    opts.resolveGlobalCluster &&
    !explicitInvite &&
    (code === "WORLD" || code.startsWith("WORLD-"))
  ) {
    try {
      code = await resolveAvailableCluster(opts.gameSlug);
    } catch {
      /* keep code */
    }
  }
  return code;
}

/** Join room with retries — does not start gameplay or solo fallback. */
export async function joinMultiplayerRoom(
  code: string,
  opts: {
    gameSlug: string;
    nickname?: string;
    maxPlayers?: MaxPlayers;
    joinRetries?: number;
    joinRetryDelayMs?: number;
  }
): Promise<GameRoom | null> {
  const nickname = opts.nickname ?? getLastNickname() ?? "Player";
  const joinOpts = {
    nickname,
    gameSlug: opts.gameSlug,
    maxPlayers: opts.maxPlayers,
  };
  const retries = opts.joinRetries ?? 20;
  const delayMs = opts.joinRetryDelayMs ?? 250;
  const deviceId = getDeviceId();
  const hasSelf = (candidate: GameRoom | null | undefined): candidate is GameRoom =>
    !!candidate?.players.some((p) => p.deviceId === deviceId);

  await ensureRoom(code);
  let room = getRoom(code);
  if (hasSelf(room)) return room;

  room = joinRoom(code, joinOpts);
  if (hasSelf(room)) return room;

  for (let i = 0; i < retries; i++) {
    room = await joinRoomAsync(code, joinOpts);
    if (hasSelf(room)) return room;
    await sleep(delayMs);
  }

  room = getRoom(code);
  return hasSelf(room) ? room : null;
}

/**
 * Full entry lifecycle: join → role → optional stale reclaim.
 * Games run sim-specific guest ack after this (Bomber stateAck, etc.).
 */
export async function resolveMultiplayerEntry(
  opts: ResolveMultiplayerEntryOptions
): Promise<MultiplayerEntryResult> {
  const nickname = opts.nickname ?? getLastNickname() ?? "Player";
  const roomCode = await resolveRoomCode(opts);
  const allowReclaim = opts.allowStaleReclaim !== false;

  let room = await joinMultiplayerRoom(roomCode, opts);
  if (!room) {
    return {
      ok: false,
      roomCode,
      error: "join_failed",
      message: "Could not join multiplayer room.",
    };
  }

  const deviceId = getDeviceId();
  let role: MultiplayerEntryRole = room.hostId === deviceId ? "host" : "guest";
  let reclaimed = false;

  if (role === "guest" && allowReclaim) {
    const ghost = opts.isGhostHost
      ? opts.isGhostHost(room)
      : !isListedHostPresent(room);
    if (ghost) {
      room = await reclaimStaleMultiplayerRoomAsync(room, nickname, opts.gameSlug);
      role = "host";
      reclaimed = true;
    } else {
      const live = opts.isLiveHost ? opts.isLiveHost(room) : isListedHostPresent(room);
      if (!live && opts.isLiveHost) {
        /* Booting host — remain guest; game waits for sim ack. */
      } else if (!live) {
        return {
          ok: false,
          roomCode,
          error: "host_unavailable",
          message: "Host unavailable — could not join.",
        };
      }
    }
  }

  return { ok: true, room, roomCode, role, reclaimed };
}
