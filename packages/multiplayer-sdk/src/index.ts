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
export { isSupabaseRealtimeConfigured, getMultiplayerSupabase } from "./transport/supabase-client";
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
