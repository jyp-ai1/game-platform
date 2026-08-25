/**
 * LocalStorage transport — MVP same-browser sync.
 * Swap to supabase-realtime / websocket without changing game code.
 */
import { getDeviceId, getLastNickname } from "@game-platform/game-sdk";
import type { GameRoom, MatchResult, MaxPlayers } from "@game-platform/shared";

import type { CreateRoomParams, JoinRoomOptions, MultiplayerTransport } from "./interface";

const ROOM_PREFIX = "play29:room:";
const ACTIVE_ROOM_KEY = "play29:active-room";
const PRESENCE_PREFIX = "play29:presence:";

const listeners = new Map<string, Set<(room: GameRoom) => void>>();

function notify(code: string, room: GameRoom): void {
  listeners.get(code.toUpperCase())?.forEach((fn) => fn(room));
}

function saveRoom(room: GameRoom): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROOM_PREFIX + room.code, JSON.stringify(room));
  notify(room.code, room);
}

function readRoom(code: string): GameRoom | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ROOM_PREFIX + code.toUpperCase());
    return raw ? (JSON.parse(raw) as GameRoom) : null;
  } catch {
    return null;
  }
}

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function updatePresence(room: GameRoom, deviceId: string, nickname: string): void {
  if (typeof window === "undefined") return;
  const entry = {
    deviceId,
    nickname,
    status: room.status === "playing" ? "playing" : room.status === "waiting" || room.status === "ready" ? "lobby" : "online",
    gameSlug: room.gameSlug,
    roomCode: room.code,
    since: new Date().toISOString(),
    spectatable: room.status === "playing",
  };
  window.localStorage.setItem(PRESENCE_PREFIX + deviceId, JSON.stringify(entry));
}

export const localStorageTransport: MultiplayerTransport = {
  createRoom(params: CreateRoomParams): GameRoom {
    const deviceId = getDeviceId();
    const nickname = params.hostNickname ?? getLastNickname() ?? "Player";
    const room: GameRoom = {
      code: (params.code ?? randomCode()).toUpperCase(),
      gameSlug: params.gameSlug,
      hostId: deviceId,
      maxPlayers: params.maxPlayers ?? 2,
      players: [{
        deviceId,
        nickname,
        ready: true,
        isGuest: params.isGuest,
        reconnectToken: deviceId.slice(0, 8),
      }],
      spectators: [],
      status: "waiting",
      countdown: 3,
      matchMode: params.matchMode ?? "private",
      createdAt: new Date().toISOString(),
    };
    saveRoom(room);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_ROOM_KEY, room.code);
    }
    updatePresence(room, deviceId, nickname);
    return room;
  },

  joinRoom(code: string, options?: JoinRoomOptions): GameRoom | null {
    const room = readRoom(code);
    if (!room || room.players.length >= room.maxPlayers) return null;
    const deviceId = getDeviceId();
    if (room.players.some((p) => p.deviceId === deviceId)) {
      if (room.spectators.includes(deviceId)) {
        room.spectators = room.spectators.filter((id) => id !== deviceId);
        saveRoom(room);
      }
      return room;
    }
    const nickname = options?.nickname ?? getLastNickname() ?? "Guest";
    room.players.push({ deviceId, nickname, ready: false, isGuest: options?.isGuest });
    saveRoom(room);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_ROOM_KEY, room.code);
    }
    updatePresence(room, deviceId, nickname);
    return room;
  },

  leaveRoom(code: string): void {
    const room = readRoom(code);
    if (!room) return;
    const deviceId = getDeviceId();
    room.players = room.players.filter((p) => p.deviceId !== deviceId);
    room.spectators = room.spectators.filter((id) => id !== deviceId);
    if (room.players.length === 0) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ROOM_PREFIX + code.toUpperCase());
      }
    } else {
      if (room.hostId === deviceId && room.players[0]) {
        room.hostId = room.players[0].deviceId;
      }
      saveRoom(room);
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PRESENCE_PREFIX + deviceId);
    }
  },

  getRoom(code: string): GameRoom | null {
    return readRoom(code);
  },

  setPlayerReady(code: string, ready: boolean): GameRoom | null {
    const room = readRoom(code);
    if (!room) return null;
    const deviceId = getDeviceId();
    room.players = room.players.map((p) =>
      p.deviceId === deviceId ? { ...p, ready } : p
    );
    if (room.players.every((p) => p.ready) && room.players.length >= 2) {
      room.status = "ready";
      room.countdown = 3;
    }
    saveRoom(room);
    return room;
  },

  send(code: string, event: string, payload: unknown): GameRoom | null {
    const room = readRoom(code);
    if (!room) return null;
    room.gameState = { ...(room.gameState ?? {}), [event]: payload, _lastEvent: event, _updatedAt: new Date().toISOString() };
    saveRoom(room);
    return room;
  },

  sync(code: string): GameRoom | null {
    return readRoom(code);
  },

  start(code: string): GameRoom | null {
    const room = readRoom(code);
    if (!room) return null;
    room.status = "playing";
    room.startedAt = new Date().toISOString();
    room.countdown = 0;
    saveRoom(room);
    room.players.forEach((p) => updatePresence(room, p.deviceId, p.nickname));
    return room;
  },

  finish(code: string, result: MatchResult): GameRoom | null {
    const room = readRoom(code);
    if (!room) return null;
    room.status = "finished";
    room.finishedAt = result.finishedAt;
    room.players = room.players.map((p) => ({
      ...p,
      score: result.scores[p.deviceId] ?? p.score,
    }));
    saveRoom(room);
    return room;
  },

  joinAsSpectator(code: string): GameRoom | null {
    const room = readRoom(code);
    if (!room) return null;
    const deviceId = getDeviceId();
    if (!room.spectators.includes(deviceId)) {
      room.spectators.push(deviceId);
      saveRoom(room);
    }
    return room;
  },

  reconnect(code: string, token: string): GameRoom | null {
    const room = readRoom(code);
    if (!room) return null;
    const player = room.players.find((p) => p.reconnectToken === token);
    if (player) return room;
    return localStorageTransport.joinRoom(code);
  },

  tickCountdown(code: string): GameRoom | null {
    const room = readRoom(code);
    if (!room || room.status !== "ready") return room;
    if (room.countdown > 0) {
      room.countdown -= 1;
      if (room.countdown === 0) {
        room.status = "playing";
        room.startedAt = new Date().toISOString();
      }
      saveRoom(room);
    }
    return room;
  },

  subscribe(code: string, listener: (room: GameRoom) => void): () => void {
    const key = code.toUpperCase();
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(listener);
    return () => listeners.get(key)?.delete(listener);
  },
};

/** Tier2 party games + existing board games */
export const PARTY_GAMES = new Set([
  "tic-tac-toe", "connect4", "air-hockey", "tank-battle",
  "mini-golf", "checkers", "reversi", "gomoku", "domino",
  "table-tennis", "billiards", "shuffleboard", "bomber",
]);

/** Tier3 realtime flagship candidates */
export const REALTIME_GAMES = new Set(["snake", "agar"]);

export function getGameTier(slug: string): "single" | "party" | "realtime" {
  if (REALTIME_GAMES.has(slug)) return "realtime";
  if (PARTY_GAMES.has(slug)) return "party";
  return "single";
}

export function isMultiplayerGame(slug: string): boolean {
  return PARTY_GAMES.has(slug) || REALTIME_GAMES.has(slug);
}

export function defaultMaxPlayers(slug: string): MaxPlayers {
  if (REALTIME_GAMES.has(slug)) return 50;
  if (slug === "bomber") return 8;
  return 2;
}
