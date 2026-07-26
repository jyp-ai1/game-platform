/** Shared multiplayer types — used by SDK, web, and games. */

export type RoomStatus = "waiting" | "ready" | "playing" | "finished" | "spectating";
export type MatchMode = "quick" | "private" | "friends" | "public";
export type MaxPlayers = 2 | 3 | 4 | 8 | 16;
export type GameTier = "single" | "party" | "realtime";

export interface RoomPlayer {
  deviceId: string;
  nickname: string;
  ready: boolean;
  isGuest?: boolean;
  reconnectToken?: string;
  score?: number;
}

export interface GameRoom {
  code: string;
  gameSlug: string;
  hostId: string;
  maxPlayers: MaxPlayers;
  players: RoomPlayer[];
  spectators: string[];
  status: RoomStatus;
  countdown: number;
  matchMode: MatchMode;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  /** Opaque game state blob synced via send/sync */
  gameState?: Record<string, unknown>;
}

export interface MatchResult {
  roomCode: string;
  gameSlug: string;
  winnerId: string | null;
  scores: Record<string, number>;
  finishedAt: string;
}

export type PresenceStatus = "online" | "lobby" | "playing" | "spectating";

export interface PresenceEntry {
  deviceId: string;
  nickname: string;
  status: PresenceStatus;
  gameSlug?: string;
  roomCode?: string;
  since: string;
  spectatable?: boolean;
}

export interface MultiplayerResultPayload {
  winnerId: string | null;
  winnerNickname: string | null;
  scores: { deviceId: string; nickname: string; score: number }[];
  xp: number;
  coins: number;
  replayScoreDelta: number;
  friendRank?: number;
  roomCode: string;
  gameSlug: string;
}
