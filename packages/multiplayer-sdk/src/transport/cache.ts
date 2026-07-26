/**
 * In-memory room cache — shared across transports.
 */
import type { GameRoom } from "@game-platform/shared";

const roomCache = new Map<string, GameRoom>();
const listeners = new Map<string, Set<(room: GameRoom) => void>>();

export function cacheGet(code: string): GameRoom | null {
  return roomCache.get(code.toUpperCase()) ?? null;
}

export function cacheSet(room: GameRoom): void {
  roomCache.set(room.code.toUpperCase(), room);
  notify(room.code, room);
}

export function cacheRemove(code: string): void {
  roomCache.delete(code.toUpperCase());
}

export function notify(code: string, room: GameRoom): void {
  listeners.get(code.toUpperCase())?.forEach((fn) => fn(room));
}

export function subscribeCache(code: string, listener: (room: GameRoom) => void): () => void {
  const key = code.toUpperCase();
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(listener);
  return () => listeners.get(key)?.delete(listener);
}

export function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
