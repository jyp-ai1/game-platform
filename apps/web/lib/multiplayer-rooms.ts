/**
 * Multiplayer room foundation (localStorage MVP) — Sprint17 Epic2.
 */
import { getDeviceId, getLastNickname } from "@game-platform/game-sdk";

const ROOM_PREFIX = "play29:room:";
const ACTIVE_ROOM_KEY = "play29:active-room";

export type RoomStatus = "waiting" | "ready" | "playing" | "spectating";
export type MaxPlayers = 2 | 3 | 4;

export interface RoomPlayer {
  deviceId: string;
  nickname: string;
  ready: boolean;
  reconnectToken?: string;
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
  createdAt: string;
}

const MULTIPLAYER_GAMES = new Set(["tic-tac-toe", "connect4", "air-hockey", "tank-battle"]);

export function isMultiplayerGame(slug: string): boolean {
  return MULTIPLAYER_GAMES.has(slug);
}

function saveRoom(room: GameRoom): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROOM_PREFIX + room.code, JSON.stringify(room));
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
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function createRoom(gameSlug: string, maxPlayers: MaxPlayers = 2): GameRoom {
  const deviceId = getDeviceId();
  const room: GameRoom = {
    code: randomCode(),
    gameSlug,
    hostId: deviceId,
    maxPlayers,
    players: [{ deviceId, nickname: getLastNickname() || "Player", ready: true, reconnectToken: deviceId.slice(0, 8) }],
    spectators: [],
    status: "waiting",
    countdown: 3,
    createdAt: new Date().toISOString(),
  };
  saveRoom(room);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVE_ROOM_KEY, room.code);
  }
  return room;
}

export function getRoom(code: string): GameRoom | null {
  return readRoom(code);
}

export function joinRoom(code: string): GameRoom | null {
  const room = readRoom(code);
  if (!room || room.players.length >= room.maxPlayers) return null;
  const deviceId = getDeviceId();
  if (room.players.some((p) => p.deviceId === deviceId)) return room;
  room.players.push({
    deviceId,
    nickname: getLastNickname() || "Player",
    ready: false,
  });
  saveRoom(room);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVE_ROOM_KEY, room.code);
  }
  return room;
}

export function setPlayerReady(code: string, ready: boolean): GameRoom | null {
  const room = readRoom(code);
  if (!room) return null;
  const deviceId = getDeviceId();
  room.players = room.players.map((p) =>
    p.deviceId === deviceId ? { ...p, ready } : p
  );
  if (room.players.every((p) => p.ready) && room.players.length >= 2) {
    room.status = "ready";
  }
  saveRoom(room);
  return room;
}

export function getInviteUrl(code: string): string {
  if (typeof window === "undefined") return `/room/${code}`;
  return `${window.location.origin}/room/${code}`;
}

export function joinAsSpectator(code: string): GameRoom | null {
  const room = readRoom(code);
  if (!room) return null;
  const deviceId = getDeviceId();
  if (!room.spectators.includes(deviceId)) {
    room.spectators.push(deviceId);
    saveRoom(room);
  }
  return room;
}

export function reconnectRoom(code: string, token: string): GameRoom | null {
  const room = readRoom(code);
  if (!room) return null;
  const player = room.players.find((p) => p.reconnectToken === token);
  if (player) return room;
  return joinRoom(code);
}

export function getDiscordShareUrl(code: string, gameSlug: string): string {
  const text = encodeURIComponent(getShareText(code, gameSlug));
  return `https://discord.com/channels/@me?text=${text}`;
}

export function getShareText(code: string, gameSlug: string): string {
  return `Re:Play ${gameSlug} · Room ${code}\n${getInviteUrl(code)}`;
}
