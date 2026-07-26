// Room lifecycle
export {
  createRoom,
  joinRoom,
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
  localStorageTransport,
} from "./transport/local-storage";

// Transport
export {
  broadcastChannelTransport,
  isSupabaseRealtimeAvailable,
} from "./transport/broadcast-channel";

// React
export { MultiplayerProvider, useMultiplayerRoom } from "./react/MultiplayerProvider";
export { useRoom } from "./react/useRoom";

// Types
export type { CreateRoomParams, JoinRoomOptions, MultiplayerTransport } from "./transport/interface";
