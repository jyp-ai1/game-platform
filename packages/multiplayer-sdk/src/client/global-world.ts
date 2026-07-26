import { getDeviceId } from "@game-platform/game-sdk";
import type { GameRoom } from "@game-platform/shared";

import { createRoom, ensureRoom, getRoom, joinRoomAsync, start } from "./room-client";

function logEntry(step: string, detail?: string): void {
  if (typeof window === "undefined") return;
  console.info(detail ? `[ENTRY] ${step} — ${detail}` : `[ENTRY] ${step}`);
}

function logEntryFail(step: string, reason: string): void {
  if (typeof window === "undefined") return;
  console.error(`[ENTRY][FAIL] step: ${step} reason: ${reason}`);
}

export const GLOBAL_WORLD_TARGET = 50;
export const CLUSTER_SIZE = 50;

const GLOBAL_BASE = "WORLD";

/** Cluster codes: WORLD, WORLD-2, WORLD-3 … */
export function globalWorldCode(gameSlug: string, clusterIndex = 1): string {
  if (gameSlug !== "snake") {
    return clusterIndex === 1 ? `GL-${gameSlug.slice(0, 4).toUpperCase()}` : `GL-${gameSlug.slice(0, 4).toUpperCase()}-${clusterIndex}`;
  }
  return clusterIndex === 1 ? GLOBAL_BASE : `${GLOBAL_BASE}-${clusterIndex}`;
}

export function isGlobalWorldRoom(code: string, gameSlug = "snake"): boolean {
  const upper = code.toUpperCase();
  if (gameSlug === "snake") {
    return upper === GLOBAL_BASE || /^WORLD-\d+$/.test(upper);
  }
  return upper.startsWith("GL-");
}

/** Pick shard with capacity — WORLD-1 first, spill to WORLD-2+ */
export async function resolveAvailableCluster(gameSlug: string): Promise<string> {
  for (let i = 1; i <= 5; i++) {
    const code = globalWorldCode(gameSlug, i);
    await ensureRoom(code);
    const room = getRoom(code);
    if (!room) return code;
    if (room.players.length < GLOBAL_WORLD_TARGET) return code;
  }
  return globalWorldCode(gameSlug, 1);
}

/** Find-or-create Global World cluster and join */
export async function joinGlobalWorld(gameSlug: string): Promise<GameRoom> {
  logEntry("CONNECTING", `joinGlobalWorld ${gameSlug}`);
  const code = await resolveAvailableCluster(gameSlug);
  await ensureRoom(code);
  let room = getRoom(code);
  if (!room) {
    room = createRoom({
      gameSlug,
      maxPlayers: GLOBAL_WORLD_TARGET,
      matchMode: "public",
      code,
    });
  }
  const joined = await joinRoomAsync(code);
  if (joined) {
    start(code);
    cacheGlobalWorldStatus(gameSlug, joined, code);
    logEntry("JOINED", code);
    return joined;
  }
  if (room.players.some((p) => p.deviceId === getDeviceId())) {
    logEntry("JOINED", `${code} (already in room)`);
    return room;
  }
  logEntryFail("JOIN", "Global World full");
  throw new Error("Global World full");
}

export interface GlobalWorldStatus {
  gameSlug: string;
  code: string;
  cluster: number;
  humans: number;
  live: number;
  max: number;
  updatedAt: string;
}

const STATUS_KEY = "play29:global-world-status";

export function cacheGlobalWorldStatus(gameSlug: string, room: GameRoom, code?: string): GlobalWorldStatus {
  const clusterMatch = (code ?? room.code).match(/-(\d+)$/);
  const cluster = clusterMatch ? Number(clusterMatch[1]) : 1;
  const status: GlobalWorldStatus = {
    gameSlug,
    code: code ?? room.code,
    cluster,
    humans: room.players.length,
    live: GLOBAL_WORLD_TARGET,
    max: GLOBAL_WORLD_TARGET,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STATUS_KEY, JSON.stringify(status));
  }
  return status;
}

export function getGlobalWorldStatus(gameSlug = "snake"): GlobalWorldStatus {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STATUS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as GlobalWorldStatus;
        if (s.gameSlug === gameSlug) return s;
      }
    } catch { /* ignore */ }
  }
  const code = globalWorldCode(gameSlug);
  const room = getRoom(code);
  return {
    gameSlug,
    code,
    cluster: 1,
    humans: room?.players.length ?? 0,
    live: GLOBAL_WORLD_TARGET,
    max: GLOBAL_WORLD_TARGET,
    updatedAt: new Date().toISOString(),
  };
}

export async function quickPlayGlobal(gameSlug: string): Promise<{ code: string; href: string }> {
  logEntry("CLICK", `quickPlayGlobal ${gameSlug}`);
  const room = await joinGlobalWorld(gameSlug);
  const playPath = gameSlug === "snake"
    ? `/flagship/snake-io/play?room=${room.code}`
    : `/games/${gameSlug}?room=${room.code}`;
  logEntry("ROUTE", playPath);
  return { code: room.code, href: playPath };
}

export const GlobalWorldEngine = {
  target: GLOBAL_WORLD_TARGET,
  clusterSize: CLUSTER_SIZE,
  code: globalWorldCode,
  isGlobal: isGlobalWorldRoom,
  join: joinGlobalWorld,
  quickPlay: quickPlayGlobal,
  status: getGlobalWorldStatus,
};
