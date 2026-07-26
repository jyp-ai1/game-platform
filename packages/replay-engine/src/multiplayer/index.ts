/**
 * Replay Engine — Multiplayer module (facade over transport layer).
 * Games use Replay.multiplayer only — never transport directly.
 */
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

import { BalanceEngine, balanceFor } from "./balance";

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
export { BalanceEngine, balanceFor, computeBalance, recommendBalance, buildHeatmap } from "./balance";

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
  balance: balanceFor,
  world: BalanceEngine.world,
  spawn: BalanceEngine.spawn,
  scale: BalanceEngine.scale,
  analytics: BalanceEngine.analytics,
  heatmap: BalanceEngine.heatmap,
  ai: BalanceEngine.ai,
};
