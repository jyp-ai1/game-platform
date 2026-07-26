/**
 * Replay Engine — Multiplayer module (facade over transport layer).
 * Games use Replay.multiplayer only — never transport directly.
 */
export type {
  CreateRoomParams,
  JoinRoomOptions,
  MultiplayerTransport,
} from "@game-platform/multiplayer-sdk";

export {
  createRoom,
  joinRoom,
  joinRoomAsync,
  ensureRoom,
  leaveRoom,
  getRoom,
  setPlayerReady,
  send,
  sync,
  start,
  finish,
  spectator,
  replay,
  tickRoomCountdown,
  subscribeRoom,
  setMultiplayerTransport,
  getMultiplayerTransport,
  initMultiplayerTransport,
  quickMatch,
  privateMatch,
  friendsMatch,
  publicMatch,
  createMatch,
  getPresenceEntries,
  setMyPresence,
  formatPresenceLabel,
  presenceMinutesAgo,
  buildMultiplayerResult,
  getPartyLinkUrl,
  shareRoom,
  isMultiplayerGame,
  getGameTier,
  defaultMaxPlayers,
  isSupabaseRealtimeConfigured,
} from "@game-platform/multiplayer-sdk";

export { startHeartbeat, stopHeartbeat, getLatencyMs } from "./heartbeat";
export { applyLatencyBuffer, mergeGameState } from "./sync";
export { watchSpectator, leaveSpectator } from "./spectator";

/** ReplayOS.Engine.Multiplayer namespace */
export const Multiplayer = {
  createRoom,
  join: joinRoom,
  joinAsync: joinRoomAsync,
  ensureRoom,
  leave: leaveRoom,
  getRoom,
  send,
  sync,
  start,
  finish,
  spectator,
  reconnect: replay,
  subscribe: subscribeRoom,
};

// Re-import for namespace object
import {
  createRoom,
  joinRoom,
  joinRoomAsync,
  ensureRoom,
  leaveRoom,
  getRoom,
  send,
  sync,
  start,
  finish,
  spectator,
  replay,
  subscribeRoom,
} from "@game-platform/multiplayer-sdk";
