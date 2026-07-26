import type { GameRoom, MatchMode, MatchResult, MaxPlayers } from "@game-platform/shared";

import { broadcastChannelTransport } from "../transport/broadcast-channel";
import type { CreateRoomParams, JoinRoomOptions, MultiplayerTransport } from "../transport/interface";

let activeTransport: MultiplayerTransport = broadcastChannelTransport;

export function setMultiplayerTransport(transport: MultiplayerTransport): void {
  activeTransport = transport;
}

export function getMultiplayerTransport(): MultiplayerTransport {
  return activeTransport;
}

/** Create a room — all games use this. */
export function createRoom(
  gameSlug: string,
  maxPlayers?: MaxPlayers,
  matchMode: MatchMode = "private"
): GameRoom {
  return activeTransport.createRoom({ gameSlug, maxPlayers, matchMode });
}

/** Join an existing room by code. */
export function joinRoom(code: string, options?: JoinRoomOptions): GameRoom | null {
  return activeTransport.joinRoom(code, options);
}

/** Leave room and clean up presence. */
export function leaveRoom(code: string): void {
  activeTransport.leaveRoom(code);
}

/** Get current room state. */
export function getRoom(code: string): GameRoom | null {
  return activeTransport.getRoom(code);
}

/** Mark local player ready/unready. */
export function setPlayerReady(code: string, ready: boolean): GameRoom | null {
  return activeTransport.setPlayerReady(code, ready);
}

/** Send game event / state update to room. */
export function send(code: string, event: string, payload: unknown): GameRoom | null {
  return activeTransport.send(code, event, payload);
}

/** Pull latest room state (sync). */
export function sync(code: string): GameRoom | null {
  return activeTransport.sync(code);
}

/** Force-start game (host or all-ready countdown complete). */
export function start(code: string): GameRoom | null {
  return activeTransport.start(code);
}

/** Finish match with results — triggers Universal Result. */
export function finish(code: string, result: MatchResult): GameRoom | null {
  return activeTransport.finish(code, result);
}

/** Join as spectator. */
export function spectator(code: string): GameRoom | null {
  return activeTransport.joinAsSpectator(code);
}

/** Reconnect with token after disconnect. */
export function replay(code: string, token: string): GameRoom | null {
  return activeTransport.reconnect(code, token);
}

/** Tick lobby countdown (1s intervals). */
export function tickRoomCountdown(code: string): GameRoom | null {
  return activeTransport.tickCountdown(code);
}

/** Subscribe to room state changes. */
export function subscribeRoom(code: string, listener: (room: GameRoom) => void): () => void {
  return activeTransport.subscribe(code, listener);
}

export type { CreateRoomParams, JoinRoomOptions };
