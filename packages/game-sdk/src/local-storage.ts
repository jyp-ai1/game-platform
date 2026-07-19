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
const SOUND_ENABLED_KEY = "play29:sound-enabled";

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

// Sound is opt-in (default off) — most visitors browsing at work/in public
// won't expect a game site to make noise unprompted.
//
// Exposed with a subscribe/notify pair (rather than a plain getter) so the
// Header toggle can use useSyncExternalStore instead of setState-in-effect —
// this project's ESLint config (react-hooks/set-state-in-effect) forbids the
// latter.
function readSoundEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(SOUND_ENABLED_KEY) === "true";
}

let soundEnabledCache = readSoundEnabled();
const soundEnabledListeners = new Set<() => void>();

export function isSoundEnabled(): boolean {
  return soundEnabledCache;
}

export function getServerSoundEnabledSnapshot(): boolean {
  return false;
}

export function subscribeSoundEnabled(listener: () => void): () => void {
  soundEnabledListeners.add(listener);
  return () => soundEnabledListeners.delete(listener);
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabledCache = enabled;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  }
  for (const listener of soundEnabledListeners) {
    listener();
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
