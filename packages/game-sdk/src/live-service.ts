/**
 * WO 95631 — Live Service Foundation.
 * Minimum play session + progression + character extension.
 * Not an RPG. Reuses existing save envelope.
 */
const STORAGE_KEY = "play29:live-service-v1";

export const LIVE_SERVICE_SLUGS = ["snake", "agar", "bomber", "re-front"] as const;
export type LiveServiceSlug = (typeof LIVE_SERVICE_SLUGS)[number];

export type LiveOutcome = "win" | "loss" | "draw" | "other";
export type LiveCharacterState = "unlocked" | "locked";
export type LiveColorState = "available" | "future";

export interface LiveResult {
  id: string;
  slug: LiveServiceSlug;
  outcome: LiveOutcome;
  score: number;
  metric?: string;
  at: string;
  sessionId: string;
}

export interface LiveGameProgress {
  playCount: number;
  wins: number;
  losses: number;
  draws: number;
  mileage: number;
  mileageThreshold: number;
  recent: LiveResult | null;
  history: LiveResult[];
  unlockedCharacterIds: string[];
  lockedCharacterIds: string[];
}

export interface LiveProfile {
  games: Record<LiveServiceSlug, LiveGameProgress>;
  totalPlayCount: number;
  mileage: number;
}

const HISTORY_MAX = 20;
const MILEAGE_PER_PLAY = 1;
const DEFAULT_MILEAGE_THRESHOLD = 10;

type ActiveSession = {
  id: string;
  slug: LiveServiceSlug;
  roomCode?: string;
  recorded: boolean;
};

const active = new Map<LiveServiceSlug, ActiveSession>();
const listeners = new Set<() => void>();
const EMPTY_GAME: LiveGameProgress = {
  playCount: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  mileage: 0,
  mileageThreshold: DEFAULT_MILEAGE_THRESHOLD,
  recent: null,
  history: [],
  unlockedCharacterIds: [],
  lockedCharacterIds: [],
};
const EMPTY_PROFILE: LiveProfile = {
  games: {
    snake: EMPTY_GAME,
    agar: EMPTY_GAME,
    bomber: EMPTY_GAME,
    "re-front": EMPTY_GAME,
  },
  totalPlayCount: 0,
  mileage: 0,
};
let profileCache: LiveProfile = EMPTY_PROFILE;
let profileRaw: string | null = "\0";

function emptyGame(): LiveGameProgress {
  return {
    playCount: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    mileage: 0,
    mileageThreshold: DEFAULT_MILEAGE_THRESHOLD,
    recent: null,
    history: [],
    unlockedCharacterIds: [],
    lockedCharacterIds: [],
  };
}

function emptyProfile(): LiveProfile {
  return {
    games: {
      snake: emptyGame(),
      agar: emptyGame(),
      bomber: emptyGame(),
      "re-front": emptyGame(),
    },
    totalPlayCount: 0,
    mileage: 0,
  };
}

function emit(): void {
  for (const cb of listeners) cb();
}

function isLiveSlug(slug: string): slug is LiveServiceSlug {
  return (LIVE_SERVICE_SLUGS as readonly string[]).includes(slug);
}

function readProfile(): LiveProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === profileRaw) return profileCache;
  profileRaw = raw;
  if (!raw) {
    profileCache = emptyProfile();
    return profileCache;
  }
  let saved: LiveProfile | null = null;
  try {
    saved = JSON.parse(raw) as LiveProfile;
  } catch {
    profileCache = EMPTY_PROFILE;
    return profileCache;
  }
  const next = emptyProfile();
  for (const slug of LIVE_SERVICE_SLUGS) {
    next.games[slug] = { ...emptyGame(), ...(saved.games?.[slug] ?? {}) };
    next.games[slug].history = Array.isArray(next.games[slug].history)
      ? next.games[slug].history.slice(0, HISTORY_MAX)
      : [];
  }
  next.totalPlayCount = LIVE_SERVICE_SLUGS.reduce((n, s) => n + next.games[s].playCount, 0);
  next.mileage = LIVE_SERVICE_SLUGS.reduce((n, s) => n + next.games[s].mileage, 0);
  profileCache = next;
  return next;
}

function writeProfile(profile: LiveProfile): LiveProfile {
  profile.totalPlayCount = LIVE_SERVICE_SLUGS.reduce((n, s) => n + profile.games[s].playCount, 0);
  profile.mileage = LIVE_SERVICE_SLUGS.reduce((n, s) => n + profile.games[s].mileage, 0);
  if (typeof window !== "undefined") {
    const raw = JSON.stringify(profile);
    window.localStorage.setItem(STORAGE_KEY, raw);
    profileRaw = raw;
    profileCache = profile;
  }
  emit();
  return profile;
}

export function getEmptyLiveProgress(): LiveGameProgress {
  return EMPTY_GAME;
}

export function getEmptyLiveProfile(): LiveProfile {
  return EMPTY_PROFILE;
}

export function loadLiveProfile(): LiveProfile {
  return readProfile();
}

export function loadLiveProgress(slug: string): LiveGameProgress {
  if (!isLiveSlug(slug)) return emptyGame();
  return readProfile().games[slug];
}

export function subscribeLiveProfile(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function classifyLiveOutcome(label?: string): LiveOutcome {
  const t = (label ?? "").toUpperCase();
  if (/WIN|EMPIRE COMPLETE/.test(t)) return "win";
  if (/DIED|DEFEAT|FALLEN|LOSS|LOSE/.test(t)) return "loss";
  if (/DRAW|STALEMATE/.test(t)) return "draw";
  return "other";
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Start or replace the in-memory play session. Drops leftover unrecorded state. */
export function beginLivePlaySession(slug: string, roomCode?: string): string | null {
  if (!isLiveSlug(slug)) return null;
  const id = newId();
  active.set(slug, { id, slug, roomCode, recorded: false });
  return id;
}

export function ensureLivePlaySession(slug: string, roomCode?: string): string | null {
  if (!isLiveSlug(slug)) return null;
  const cur = active.get(slug);
  if (cur && !cur.recorded) return cur.id;
  return beginLivePlaySession(slug, roomCode);
}

export function getLivePlaySession(slug: string): ActiveSession | undefined {
  if (!isLiveSlug(slug)) return undefined;
  return active.get(slug);
}

/** UI left the game — drop leftover session so room/result cannot leak. */
export function clearLivePlaySession(slug: string): void {
  if (!isLiveSlug(slug)) return;
  active.delete(slug);
}

export function recordLiveResult(
  slug: string,
  payload: { outcome?: string | LiveOutcome; score: number; metric?: string }
): LiveGameProgress {
  if (!isLiveSlug(slug)) return emptyGame();
  const sessionId = ensureLivePlaySession(slug);
  const sess = sessionId ? active.get(slug) : undefined;
  if (!sess) return loadLiveProgress(slug);
  if (sess.recorded) return loadLiveProgress(slug);

  const outcome = classifyLiveOutcome(payload.outcome);
  const result: LiveResult = {
    id: newId(),
    slug,
    outcome,
    score: payload.score,
    metric: payload.metric,
    at: new Date().toISOString(),
    sessionId: sess.id,
  };

  const profile = readProfile();
  const game = profile.games[slug];
  game.playCount += 1;
  if (outcome === "win") game.wins += 1;
  else if (outcome === "loss") game.losses += 1;
  else if (outcome === "draw") game.draws += 1;
  game.mileage += MILEAGE_PER_PLAY;
  game.recent = result;
  game.history = [result, ...game.history].slice(0, HISTORY_MAX);
  sess.recorded = true;
  writeProfile(profile);
  return game;
}

export function liveCharacterState(slug: string, characterId: string): LiveCharacterState {
  const game = loadLiveProgress(slug);
  if (game.lockedCharacterIds.includes(characterId)) return "locked";
  return "unlocked";
}

export function liveColorState(_color: string): LiveColorState {
  return "available";
}

export function lockedLiveCharacterIds(slug: string): string[] {
  return loadLiveProgress(slug).lockedCharacterIds;
}

export function formatLiveProgressLine(slug: string): string | null {
  const game = loadLiveProgress(slug);
  if (game.playCount <= 0) return null;
  const last =
    game.recent?.outcome === "win"
      ? "WIN"
      : game.recent?.outcome === "loss"
        ? "LOSS"
        : game.recent?.outcome === "draw"
          ? "DRAW"
          : game.recent
            ? "PLAYED"
            : null;
  return last ? `PLAYS ${game.playCount} · LAST ${last}` : `PLAYS ${game.playCount}`;
}

export function liveServiceContractSmoke(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const slug: LiveServiceSlug = "snake";
  clearLivePlaySession(slug);
  const a = beginLivePlaySession(slug);
  const first = recordLiveResult(slug, { outcome: "YOU DIED", score: 10 });
  const dup = recordLiveResult(slug, { outcome: "YOU DIED", score: 99 });
  if (!a) errors.push("session missing");
  if (first.playCount !== dup.playCount) errors.push("double record");
  if (first.history[0]?.score !== 10) errors.push("stale result reuse");
  beginLivePlaySession(slug);
  const rematch = recordLiveResult(slug, { outcome: "YOU WIN", score: 20 });
  if (rematch.playCount !== first.playCount + 1) errors.push("rematch not counted");
  if (liveCharacterState(slug, "any") !== "unlocked") errors.push("default character must be unlocked");
  if (liveColorState("#22d3ee") !== "available") errors.push("current colors must stay available");
  clearLivePlaySession(slug);
  return { ok: errors.length === 0, errors };
}
