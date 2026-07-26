import type { GameRoom, MatchMode, MatchResult, MaxPlayers } from "@game-platform/shared";

import { getMultiplayerTransport, setMultiplayerTransport, initMultiplayerTransport } from "../transport/init";
import { ensureRoomLoaded, joinRoomAsync as supabaseJoinAsync } from "../transport/supabase";
import type { CreateRoomParams, JoinRoomOptions, MultiplayerTransport } from "../transport/interface";

if (typeof window !== "undefined") initMultiplayerTransport();

export { setMultiplayerTransport, getMultiplayerTransport, initMultiplayerTransport };

export function createRoom(
  gameSlug: string,
  maxPlayers?: MaxPlayers,
  matchMode: MatchMode = "private"
): GameRoom {
  return getMultiplayerTransport().createRoom({ gameSlug, maxPlayers, matchMode });
}

export function joinRoom(code: string, options?: JoinRoomOptions): GameRoom | null {
  return getMultiplayerTransport().joinRoom(code, options);
}

export async function joinRoomAsync(code: string, options?: JoinRoomOptions): Promise<GameRoom | null> {
  await ensureRoom(code);
  return getMultiplayerTransport().joinRoom(code, options);
}

export async function ensureRoom(code: string): Promise<GameRoom | null> {
  const cached = getMultiplayerTransport().getRoom(code);
  if (cached) return cached;
  return ensureRoomLoaded(code);
}

/** Leave room and clean up presence. */
export function leaveRoom(code: string): void {
  getMultiplayerTransport().leaveRoom(code);
}

/** Get current room state. */
export function getRoom(code: string): GameRoom | null {
  return getMultiplayerTransport().getRoom(code);
}

/** Mark local player ready/unready. */
export function setPlayerReady(code: string, ready: boolean): GameRoom | null {
  return getMultiplayerTransport().setPlayerReady(code, ready);
}

/** Send game event / state update to room. */
export function send(code: string, event: string, payload: unknown): GameRoom | null {
  return getMultiplayerTransport().send(code, event, payload);
}

/** Pull latest room state (sync). */
export function sync(code: string): GameRoom | null {
  return getMultiplayerTransport().sync(code);
}

/** Force-start game (host or all-ready countdown complete). */
export function start(code: string): GameRoom | null {
  return getMultiplayerTransport().start(code);
}

/** Finish match with results — triggers Universal Result. */
export function finish(code: string, result: MatchResult): GameRoom | null {
  return getMultiplayerTransport().finish(code, result);
}

/** Join as spectator. */
export function spectator(code: string): GameRoom | null {
  return getMultiplayerTransport().joinAsSpectator(code);
}

/** Reconnect with token after disconnect. */
export function replay(code: string, token: string): GameRoom | null {
  return getMultiplayerTransport().reconnect(code, token);
}

/** Tick lobby countdown (1s intervals). */
export function tickRoomCountdown(code: string): GameRoom | null {
  return getMultiplayerTransport().tickCountdown(code);
}

/** Subscribe to room state changes. */
export function subscribeRoom(code: string, listener: (room: GameRoom) => void): () => void {
  return getMultiplayerTransport().subscribe(code, listener);
}

export type { CreateRoomParams, JoinRoomOptions, MultiplayerTransport };
