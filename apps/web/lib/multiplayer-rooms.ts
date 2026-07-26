/**
 * @deprecated Use @game-platform/multiplayer-sdk directly.
 * Thin re-export for backward compatibility.
 */
export {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  setPlayerReady,
  tickRoomCountdown,
  spectator as joinAsSpectator,
  replay as reconnectRoom,
  getInviteUrl,
  getKakaoShareUrl,
  getDiscordShareUrl,
  getShareText,
  isMultiplayerGame,
} from "@game-platform/multiplayer-sdk";

export type { GameRoom, RoomPlayer, RoomStatus, MaxPlayers } from "@game-platform/shared";
