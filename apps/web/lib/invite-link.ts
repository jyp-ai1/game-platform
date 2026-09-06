/**
 * CTO P0-2 — unified invite link contract for Snake / Agar / Bomber.
 * Format: /games/{slug}/play?room={ROOM_ID}
 */
import { createRoom } from "@game-platform/multiplayer-sdk";

export const ACTIVE_ROOM_KEY = "play29:active-room";

const WORLD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeWorldInviteCode(): string {
  let suffix = "";
  for (let i = 0; i < 3; i++) {
    suffix += WORLD_ALPHABET[Math.floor(Math.random() * WORLD_ALPHABET.length)]!;
  }
  return `WORLD-${suffix}`;
}

export function defaultBomberInviteRoom(): string {
  return "BOMBER-A";
}

export function isWorldRoom(code: string): boolean {
  return /^WORLD-[A-Z0-9]+$/.test(code.trim().toUpperCase());
}

export function isBomberRoom(code: string): boolean {
  return /^BOMBER-[A-D]$/.test(code.trim().toUpperCase());
}

export function pinActiveRoom(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_ROOM_KEY, code.trim().toUpperCase());
  } catch {
    /* ignore */
  }
}

export function readPinnedRoom(gameSlug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromUrl =
      new URLSearchParams(window.location.search).get("room")?.toUpperCase() ??
      new URLSearchParams(window.location.search).get("invite")?.toUpperCase() ??
      null;
    if (fromUrl) {
      if (gameSlug === "snake" || gameSlug === "agar") {
        if (isWorldRoom(fromUrl) || fromUrl === "WORLD") {
          pinActiveRoom(fromUrl);
          return fromUrl;
        }
      }
      if (gameSlug === "bomber" && isBomberRoom(fromUrl)) {
        pinActiveRoom(fromUrl);
        return fromUrl;
      }
    }
    const active = window.localStorage.getItem(ACTIVE_ROOM_KEY)?.toUpperCase() ?? null;
    if (!active) return null;
    if (gameSlug === "snake" || gameSlug === "agar") {
      return isWorldRoom(active) ? active : null;
    }
    if (gameSlug === "bomber") {
      return isBomberRoom(active) ? active : null;
    }
    return active;
  } catch {
    return null;
  }
}

/** Resolve room id for invite copy — slug-specific, never cross-game swap. */
export function resolveInviteRoomCode(gameSlug: string): string {
  const pinned = readPinnedRoom(gameSlug);
  if (pinned) return pinned;

  if (gameSlug === "snake" || gameSlug === "agar") {
    const code = makeWorldInviteCode();
    createRoom({
      gameSlug,
      maxPlayers: gameSlug === "snake" ? 50 : 8,
      matchMode: "public",
      code,
    });
    pinActiveRoom(code);
    return code;
  }

  if (gameSlug === "bomber") {
    const code = defaultBomberInviteRoom();
    createRoom({ gameSlug, maxPlayers: 8, matchMode: "public", code });
    pinActiveRoom(code);
    return code;
  }

  const room = createRoom({ gameSlug, maxPlayers: 8, matchMode: "friends" });
  pinActiveRoom(room.code);
  return room.code;
}

/** Unified invite path — all MP games use /games/{slug}/play?room= */
export function invitePlayPath(gameSlug: string, roomCode: string): string {
  const code = roomCode.trim().toUpperCase();
  return `/games/${gameSlug}/play?room=${encodeURIComponent(code)}`;
}

export function buildInvitePlayUrl(origin: string, gameSlug: string, roomCode: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${invitePlayPath(gameSlug, roomCode)}`;
}

export function readInviteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://game29.vercel.app";
}
