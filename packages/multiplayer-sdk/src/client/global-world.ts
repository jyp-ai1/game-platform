import { getDeviceId } from "@game-platform/game-sdk";
import type { GameRoom } from "@game-platform/shared";

import { recordEntryCrash } from "./entry-crash-log";
import { createRoom, ensureRoom, getRoom, joinRoomAsync, start } from "./room-client";

export const GLOBAL_WORLD_TARGET = 50;
export const CLUSTER_SIZE = 50;
export const JOIN_TIMEOUT_MS = 3000;

const GLOBAL_BASE = "WORLD";

function entryTrace(
  step: string,
  status: "PASS" | "FAIL" | "START",
  detail?: string,
  ms?: number
): void {
  if (typeof window === "undefined") return;
  const suffix = detail ? ` ${detail}` : "";
  const time = ms !== undefined ? ` ${ms}ms` : "";
  const line = `[ENTRY] ${step} ${status}${suffix}${time}`;
  if (status === "FAIL") console.warn(line);
  else console.info(line);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

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

/** Pick shard with capacity — WORLD first, spill to WORLD-2+ */
export async function resolveAvailableCluster(gameSlug: string): Promise<string> {
  for (let i = 1; i <= 15; i++) {
    const code = globalWorldCode(gameSlug, i);
    await ensureRoom(code);
    const room = getRoom(code);
    if (!room) return code;
    if (room.players.length < GLOBAL_WORLD_TARGET) return code;
  }
  return globalWorldCode(gameSlug, 1);
}

/** Find-or-create Global World cluster and join — spills WORLD → WORLD-2+ when shard full. */
export async function joinGlobalWorld(gameSlug: string): Promise<GameRoom> {
  const t0 = performance.now();
  entryTrace("JOIN", "START", gameSlug);
  const deviceId = getDeviceId();

  for (let i = 1; i <= 15; i++) {
    const code = globalWorldCode(gameSlug, i);
    try {
      await withTimeout(ensureRoom(code), JOIN_TIMEOUT_MS, "ensureRoom");
      let room = getRoom(code);
      if (!room) {
        entryTrace("JOIN", "START", `bootstrap ${code}`);
        room = createRoom({
          gameSlug,
          maxPlayers: GLOBAL_WORLD_TARGET,
          matchMode: "public",
          code,
        });
      }

      if (
        room.players.length >= GLOBAL_WORLD_TARGET &&
        !room.players.some((p) => p.deviceId === deviceId)
      ) {
        continue;
      }

      const joined = await withTimeout(
        joinRoomAsync(code, { gameSlug, maxPlayers: GLOBAL_WORLD_TARGET }),
        JOIN_TIMEOUT_MS,
        "joinRoom"
      );
      const result =
        joined && joined.players.some((p) => p.deviceId === deviceId)
          ? joined
          : room.players.some((p) => p.deviceId === deviceId)
            ? room
            : null;

      if (result) {
        start(code);
        cacheGlobalWorldStatus(gameSlug, result, code);
        entryTrace("JOIN", "PASS", code, Math.round(performance.now() - t0));
        return result;
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      entryTrace("JOIN", "FAIL", `${code} ${reason}`);
    }
  }

  entryTrace("JOIN", "FAIL", "Global World full", Math.round(performance.now() - t0));
  recordEntryCrash("JOIN", "Global World full", { room: GLOBAL_BASE });
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
  entryTrace("CLICK", "START", `quickPlayGlobal ${gameSlug}`);
  const t0 = performance.now();
  const room = await joinGlobalWorld(gameSlug);
  const playPath = gameSlug === "snake"
    ? `/flagship/snake-io/play?room=${room.code}`
    : `/games/${gameSlug}?room=${room.code}`;
  entryTrace("ROUTE", "PASS", playPath, Math.round(performance.now() - t0));
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
