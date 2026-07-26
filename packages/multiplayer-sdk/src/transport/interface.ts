import type { GameRoom, MatchResult, MaxPlayers, MatchMode } from "@game-platform/shared";

export interface CreateRoomParams {
  gameSlug: string;
  maxPlayers?: MaxPlayers;
  matchMode?: MatchMode;
  hostNickname?: string;
  isGuest?: boolean;
  /** Fixed room code — Global World shards */
  code?: string;
}

export interface JoinRoomOptions {
  nickname?: string;
  isGuest?: boolean;
}

export interface MultiplayerTransport {
  createRoom(params: CreateRoomParams): GameRoom;
  joinRoom(code: string, options?: JoinRoomOptions): GameRoom | null;
  leaveRoom(code: string): void;
  getRoom(code: string): GameRoom | null;
  setPlayerReady(code: string, ready: boolean): GameRoom | null;
  send(code: string, event: string, payload: unknown): GameRoom | null;
  sync(code: string): GameRoom | null;
  start(code: string): GameRoom | null;
  finish(code: string, result: MatchResult): GameRoom | null;
  joinAsSpectator(code: string): GameRoom | null;
  reconnect(code: string, token: string): GameRoom | null;
  tickCountdown(code: string): GameRoom | null;
  subscribe(code: string, listener: (room: GameRoom) => void): () => void;
}
