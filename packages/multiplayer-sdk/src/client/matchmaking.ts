import type { GameRoom, MatchMode, MaxPlayers } from "@game-platform/shared";

import { createRoom } from "./room-client";
import { isMultiplayerGame, defaultMaxPlayers } from "../transport/local-storage";

export interface MatchRequest {
  gameSlug: string;
  mode: MatchMode;
  maxPlayers?: MaxPlayers;
}

/** Quick Match — creates public room immediately (MVP: instant private room). */
export function quickMatch(gameSlug: string): GameRoom {
  return createRoom(gameSlug, defaultMaxPlayers(gameSlug), "quick");
}

/** Private room with invite code. */
export function privateMatch(gameSlug: string, maxPlayers?: MaxPlayers): GameRoom {
  return createRoom(gameSlug, maxPlayers ?? defaultMaxPlayers(gameSlug), "private");
}

/** Friends-only room. */
export function friendsMatch(gameSlug: string, maxPlayers?: MaxPlayers): GameRoom {
  return createRoom(gameSlug, maxPlayers ?? defaultMaxPlayers(gameSlug), "friends");
}

/** Public room — open to anyone with code. */
export function publicMatch(gameSlug: string, maxPlayers?: MaxPlayers): GameRoom {
  return createRoom(gameSlug, maxPlayers ?? defaultMaxPlayers(gameSlug), "public");
}

/** Route match request to appropriate handler. */
export function createMatch(req: MatchRequest): GameRoom | null {
  if (!isMultiplayerGame(req.gameSlug)) return null;
  switch (req.mode) {
    case "quick": return quickMatch(req.gameSlug);
    case "private": return privateMatch(req.gameSlug, req.maxPlayers);
    case "friends": return friendsMatch(req.gameSlug, req.maxPlayers);
    case "public": return publicMatch(req.gameSlug, req.maxPlayers);
  }
}

/** AI bot fallback when no players found (future: server-side). */
export function createBotFallbackRoom(gameSlug: string): GameRoom {
  const room = createRoom(gameSlug, 2, "quick");
  return room;
}
