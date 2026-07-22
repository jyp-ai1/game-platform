// Season XP/Level — a second, independent progression track alongside the
// lifetime XP in engagement.ts. Same 3 universal hook points, same XP
// constants, same leveling formula — just a separate cache/key, so nothing
// here duplicates engagement.ts's logic, only its wiring.
//
// Storage is keyed by CURRENT_SEASON.id specifically so that introducing a
// new season later is just a new key (fresh 0 XP, no migration) — this is
// the "reset structure ready, reset not yet triggered" the season system
// needs, without writing real reset/rollover logic this sprint.
import {
  PLAY_XP,
  SCORE_REPORT_XP,
  NEW_BEST_BONUS_XP,
  ACHIEVEMENT_XP,
  xpForLevel,
  levelForXp,
  type LevelProgress,
} from "./engagement";
import { subscribeEngagementEvents } from "./engagement-events";

export const CURRENT_SEASON = { id: "season-1", label: "Season 1" } as const;

const SEASON_XP_KEY = `play29:season-xp:${CURRENT_SEASON.id}`;

function readNumber(key: string): number {
  if (typeof window === "undefined") {
    return 0;
  }
  const raw = window.localStorage.getItem(key);
  return raw ? Number(raw) : 0;
}

function writeNumber(key: string, value: number): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, String(value));
  }
}

let seasonXpCache = readNumber(SEASON_XP_KEY);

const seasonListeners = new Set<() => void>();
function notifySeason(): void {
  for (const listener of seasonListeners) listener();
}
export function subscribeSeason(listener: () => void): () => void {
  seasonListeners.add(listener);
  return () => seasonListeners.delete(listener);
}

export function getSeasonXP(): number {
  return seasonXpCache;
}
export function getServerSeasonXPSnapshot(): number {
  return 0;
}

export function getSeasonLevel(): number {
  return levelForXp(seasonXpCache);
}
export function getServerSeasonLevelSnapshot(): number {
  return 1;
}

function addSeasonXP(amount: number): void {
  seasonXpCache += amount;
  writeNumber(SEASON_XP_KEY, seasonXpCache);
  notifySeason();
}

// Same "never mutate someone else's system" inversion as missions.ts: this
// module reacts to mission/weekly-mission completions rather than those
// systems calling into season.ts directly. Achievement unlocks are also
// only observable as an event (they're decided internally inside
// engagement.ts's unlockAchievement, not at one of the 3 call-site hooks),
// so subscribing here is the only way season XP can stay proportional to
// lifetime XP instead of quietly falling behind by every achievement bonus.
subscribeEngagementEvents((event) => {
  if (
    event.type === "mission-completed" ||
    event.type === "weekly-mission-completed" ||
    event.type === "daily-reward-claimed"
  ) {
    addSeasonXP(event.xp);
  }
  if (event.type === "achievement-unlocked") {
    addSeasonXP(ACHIEVEMENT_XP);
  }
});

/** Hook 1 — call alongside engagement.ts's recordSessionStart. */
export function recordSeasonSessionStart(): void {
  addSeasonXP(PLAY_XP);
}

/** Hook 2 — call alongside engagement.ts's recordScoreReport. */
export function recordSeasonScoreReport(): void {
  addSeasonXP(SCORE_REPORT_XP);
}

/** Call alongside engagement.ts's recordNewBest. */
export function recordSeasonNewBest(): void {
  addSeasonXP(NEW_BEST_BONUS_XP);
}

// No recordSeasonRankingSubmitted: engagement.ts's own recordRankingSubmitted
// doesn't award XP directly either (it only unlocks the "first-ranking"
// achievement) — that bonus already reaches season XP once, correctly,
// through the achievement-unlocked subscription above. A season-specific
// function here would just double-count it.

function computeSeasonProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const levelBaseXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpIntoLevel = xp - levelBaseXp;
  const xpNeededForLevel = nextLevelXp - levelBaseXp;
  return {
    level,
    xpIntoLevel,
    xpNeededForLevel,
    percent:
      xpNeededForLevel === 0 ? 100 : (xpIntoLevel / xpNeededForLevel) * 100,
  };
}

// Cached and only recomputed when seasonXpCache changes — same rationale as
// engagement.ts's getLevelProgress: useSyncExternalStore needs a stable
// reference when nothing changed, or React infinite-loops.
let seasonProgressCacheXp = seasonXpCache;
let seasonProgressCache = computeSeasonProgress(seasonXpCache);

export function getSeasonProgress(): LevelProgress {
  if (seasonProgressCacheXp !== seasonXpCache) {
    seasonProgressCacheXp = seasonXpCache;
    seasonProgressCache = computeSeasonProgress(seasonXpCache);
  }
  return seasonProgressCache;
}

const SERVER_SEASON_PROGRESS_SNAPSHOT: LevelProgress = {
  level: 1,
  xpIntoLevel: 0,
  xpNeededForLevel: xpForLevel(2) - xpForLevel(1),
  percent: 0,
};
export function getServerSeasonProgressSnapshot(): LevelProgress {
  return SERVER_SEASON_PROGRESS_SNAPSHOT;
}

export interface SeasonBadgeTier {
  level: number;
  name: string;
}

// Purely derived from level — no separate unlock-state to persist. Ordered
// ascending; getSeasonBadge returns the highest tier reached (or null).
const SEASON_BADGE_TIERS: SeasonBadgeTier[] = [
  { level: 5, name: "Bronze" },
  { level: 10, name: "Silver" },
  { level: 20, name: "Gold" },
];

export function getSeasonBadge(level: number): SeasonBadgeTier | null {
  let current: SeasonBadgeTier | null = null;
  for (const tier of SEASON_BADGE_TIERS) {
    if (level >= tier.level) {
      current = tier;
    }
  }
  return current;
}
