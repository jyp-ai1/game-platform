// Room lifecycle
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
} from "./client/room-client";

export {
  createNetworkScheduler,
  networkIntervalFromPhysicsMs,
  type NetworkScheduler,
  type NetworkSchedulerStats,
} from "./client/network-scheduler";

// Matchmaking
export {
  quickMatch,
  privateMatch,
  friendsMatch,
  publicMatch,
  createMatch,
  createBotFallbackRoom,
  type MatchRequest,
} from "./client/matchmaking";

export {
  joinGlobalWorld,
  quickPlayGlobal,
  getGlobalWorldStatus,
  cacheGlobalWorldStatus,
  globalWorldCode,
  isGlobalWorldRoom,
  resolveAvailableCluster,
  GLOBAL_WORLD_TARGET,
  CLUSTER_SIZE,
  GlobalWorldEngine,
  type GlobalWorldStatus,
} from "./client/global-world";

export {
  EntryCrashLog,
  recordEntryCrash,
  loadEntryCrashLog,
  exportEntryCrashLogText,
  copyEntryCrashLogText,
  clearEntryCrashLog,
  type EntryCrashRecord,
} from "./client/entry-crash-log";

export {
  DEFAULT_ROOM_BY_SLUG,
  isListedHostPresent,
  joinMultiplayerRoom,
  reclaimStaleMultiplayerRoom,
  reclaimStaleMultiplayerRoomAsync,
  resolveDefaultRoomCode,
  resolveMultiplayerEntry,
  resolveRoomCodeFromLocation,
  roomGameStateAgeMs,
  type MultiplayerEntryFailure,
  type MultiplayerEntryResult,
  type MultiplayerEntryRole,
  type MultiplayerEntrySuccess,
  type MultiplayerFlagshipSlug,
  type ResolveMultiplayerEntryOptions,
} from "./client/resolve-multiplayer-entry";

// Lobby / invites
export {
  getPartyLinkUrl,
  getInviteUrl,
  getShareText,
  getKakaoShareUrl,
  getDiscordShareUrl,
  getSmsShareUrl,
  shareRoom,
  getQrTargetUrl,
} from "./client/lobby";

// Presence
export {
  getPresenceEntries,
  fetchPresenceEntries,
  setMyPresence,
  formatPresenceLabel,
  presenceMinutesAgo,
} from "./client/presence";

// Universal result
export { buildMultiplayerResult } from "./client/universal-result";

// Game tiers
export {
  isMultiplayerGame,
  getGameTier,
  defaultMaxPlayers,
  PARTY_GAMES,
  REALTIME_GAMES,
} from "./transport/local-storage";

// Transport
export { isSupabaseRealtimeConfigured, getMultiplayerSupabase, registerMultiplayerSupabase } from "./transport/supabase-client";
export { isSupabaseRealtimeAvailable } from "./transport/broadcast-channel";
export { supabaseTransport } from "./transport/supabase";
export { memoryTransport } from "./transport/memory";
export { broadcastChannelTransport } from "./transport/broadcast-channel";
export { localStorageTransport } from "./transport/local-storage";

// React
export { MultiplayerProvider, useMultiplayerRoom } from "./react/MultiplayerProvider";
export { useRoom } from "./react/useRoom";

// Types
export type { CreateRoomParams, JoinRoomOptions, MultiplayerTransport } from "./transport/interface";
