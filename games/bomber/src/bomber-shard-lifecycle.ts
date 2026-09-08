/**
 * Shared map shards (BOMBER-A..D) persist host roster in Postgres.
 * Sim blobs are often omitted — a listed host with no fresh `state`
 * broadcast is a ghost, not a live World.
 */
import { isListedHostPresent, roomGameStateAgeMs } from "@game-platform/multiplayer-sdk";
import type { GameRoom } from "@game-platform/shared";

import type { BomberSyncState } from "./bomber-engine";

/** Map shard rooms reuse Supabase rows — reclaim when sim is stale. */
export const SHARD_STATE_STALE_MS = 4000;

export type BomberShardAction = "reclaim" | "fail";

export type BomberHostAckWait = {
  acked: boolean;
  /** Host broadcast a playable `state` for this map during the wait. */
  sawHostState: boolean;
};

/** Stale sim blob or missing host roster — reclaim before join/wait. */
export function isGhostBomberHost(room: GameRoom): boolean {
  if (!isListedHostPresent(room)) return true;
  const hasState = !!room.gameState?.state;
  if (!hasState) return false;
  return roomGameStateAgeMs(room) >= SHARD_STATE_STALE_MS;
}

/** Confirmed live host — fresh state with alive sim host (not stale ghost). */
export function isLiveBomberHost(room: GameRoom): boolean {
  if (!isListedHostPresent(room)) return false;
  if (!room.gameState?.state) return false;
  if (roomGameStateAgeMs(room) >= SHARD_STATE_STALE_MS) return false;
  const hostId = room.hostId;
  const gs = room.gameState.state as BomberSyncState;
  const simHost = gs?.players?.find((p) => p.id === hostId && !p.isBot);
  return !!simHost?.alive;
}

/**
 * After guest state-ack wait: no host broadcast → reclaim as MP host.
 * Live host playing this map but no seat → Connection failed (no Solo).
 */
export function decideBomberGuestTimeout(wait: BomberHostAckWait): BomberShardAction {
  if (wait.acked) return "fail";
  if (wait.sawHostState) return "fail";
  return "reclaim";
}

/** Join failed on a shared shard — reclaim unless a live host is confirmed. */
export function decideBomberJoinFailed(room: GameRoom | null | undefined): BomberShardAction {
  if (!room) return "reclaim";
  if (isLiveBomberHost(room)) return "fail";
  return "reclaim";
}

export function noteBomberHostState(
  state: BomberSyncState | undefined,
  expectedMapId: number
): boolean {
  return !!state && state.mapId === expectedMapId && !state.matchOver;
}
