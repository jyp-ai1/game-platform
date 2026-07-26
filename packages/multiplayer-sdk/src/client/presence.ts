import { getDeviceId, getLastNickname } from "@game-platform/game-sdk";
import type { PresenceEntry, PresenceStatus } from "@game-platform/shared";

import { createRoom, getRoom, joinRoom } from "./room-client";
import { localStorageTransport } from "../transport/local-storage";

const PRESENCE_PREFIX = "play29:presence:";

/** Read all known presence entries from localStorage. */
export function getPresenceEntries(): PresenceEntry[] {
  if (typeof window === "undefined") return [];
  const entries: PresenceEntry[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(PRESENCE_PREFIX)) continue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) entries.push(JSON.parse(raw) as PresenceEntry);
    } catch { /* skip */ }
  }
  return entries.filter((e) => e.deviceId !== getDeviceId());
}

/** Update own presence status. */
export function setMyPresence(status: PresenceStatus, gameSlug?: string, roomCode?: string): void {
  if (typeof window === "undefined") return;
  const entry: PresenceEntry = {
    deviceId: getDeviceId(),
    nickname: getLastNickname() || "Player",
    status,
    gameSlug,
    roomCode,
    since: new Date().toISOString(),
    spectatable: status === "playing",
  };
  window.localStorage.setItem(PRESENCE_PREFIX + getDeviceId(), JSON.stringify(entry));
}

/** Format presence for UI: "민수 · Snake Playing · 2분" */
export function formatPresenceLabel(entry: PresenceEntry): string {
  const game = entry.gameSlug ? entry.gameSlug.replace(/-/g, " ") : "";
  if (entry.status === "playing" && game) return `${entry.nickname} · ${game} Playing`;
  if (entry.status === "lobby") return `${entry.nickname} · Lobby`;
  if (entry.status === "spectating") return `${entry.nickname} · Spectating`;
  return `${entry.nickname} · Online`;
}

/** Minutes since presence update. */
export function presenceMinutesAgo(entry: PresenceEntry): number {
  const ms = Date.now() - new Date(entry.since).getTime();
  return Math.max(0, Math.floor(ms / 60_000));
}

export { getRoom, createRoom, joinRoom, localStorageTransport };
