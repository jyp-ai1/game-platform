// Pure browser localStorage helpers — no backend dependency. The site has no
// login (see Sprint 3 decision: identity is a per-browser device_id, not an
// account), so "personal best" and "last nickname used" both live here.
//
// The "play29:" key prefix predates the Re:Play rebrand and is kept as-is —
// it's an internal storage format identifier, not user-facing brand text.
// Renaming it would orphan every existing visitor's best scores/nickname/
// device_id (the latter is tied to rows in the server-side `scores` table,
// so losing it would make a returning player's leaderboard entry
// unreachable from their browser).
const BEST_SCORE_PREFIX = "play29:best-score:";
const NICKNAME_KEY = "play29:nickname";
const DEVICE_ID_KEY = "play29:device-id";

export function getBestScore(gameSlug: string): number {
  if (typeof window === "undefined") {
    return 0;
  }
  const raw = window.localStorage.getItem(BEST_SCORE_PREFIX + gameSlug);
  return raw ? Number(raw) : 0;
}

export function setBestScore(gameSlug: string, score: number): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(BEST_SCORE_PREFIX + gameSlug, String(score));
  }
}

export function getLastNickname(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(NICKNAME_KEY) ?? "";
}

export function setLastNickname(nickname: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(NICKNAME_KEY, nickname);
  }
}

export function getDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  let deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}
