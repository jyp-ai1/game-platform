// Shared XP/level/achievement system — every game funnels through the same
// three hook points (session start, score report, ranking submitted), so
// none of the 16 game engines need to know this system exists. See
// context.tsx (reportScore/handleSubmit) and apps/web's
// recently-played-recorder.tsx (session start) for the call sites.
//
// LocalStorage-only for now (no login yet) — schema is kept flat/serializable
// so it can be synced to Supabase later without a redesign.
import {
  emitEngagementEvent,
  subscribeEngagementEvents,
} from "./engagement-events";

const XP_KEY = "play29:xp";
const ACHIEVEMENTS_KEY = "play29:achievements";
const DAILY_STREAK_KEY = "play29:daily-streak";
const CATEGORY_PLAY_COUNTS_KEY = "play29:category-play-counts";
const TOTAL_PLAY_COUNT_KEY = "play29:total-play-count";

export const PLAY_XP = 5;
export const SCORE_REPORT_XP = 10;
export const NEW_BEST_BONUS_XP = 15;
export const ACHIEVEMENT_XP = 50;

export type AchievementId =
  | "first-play"
  | "first-ranking"
  | "puzzle-master"
  | "retro-lover"
  | "snake-master"
  | "endless-player";

export interface AchievementDefinition {
  id: AchievementId;
  nameKo: string;
  descriptionKo: string;
}

// Legend/Top100/Perfect Memory are deferred to a later sprint (they need
// leaderboard-rank lookups / a combined-achievement condition / a
// reportScore signature change respectively — each is its own scope).
export const ACHIEVEMENTS: Record<AchievementId, AchievementDefinition> = {
  "first-play": {
    id: "first-play",
    nameKo: "첫 게임 플레이",
    descriptionKo: "아무 게임이나 한 번 플레이하세요.",
  },
  "first-ranking": {
    id: "first-ranking",
    nameKo: "첫 랭킹 등록",
    descriptionKo: "리더보드에 처음으로 기록을 등록하세요.",
  },
  "puzzle-master": {
    id: "puzzle-master",
    nameKo: "퍼즐 마스터",
    descriptionKo: "퍼즐 카테고리 게임을 10회 플레이하세요.",
  },
  "retro-lover": {
    id: "retro-lover",
    nameKo: "Retro Lover",
    descriptionKo: "아케이드 카테고리 게임을 20회 플레이하세요.",
  },
  "snake-master": {
    id: "snake-master",
    nameKo: "Snake Master",
    descriptionKo: "Snake에서 10,000점을 달성하세요.",
  },
  "endless-player": {
    id: "endless-player",
    nameKo: "Endless Player",
    descriptionKo: "7일 연속 플레이하세요.",
  },
};

export interface AchievementUnlock {
  unlockedAt: string;
}
export type AchievementsState = Partial<Record<AchievementId, AchievementUnlock>>;

export interface DailyStreakState {
  lastPlayedDate: string | null;
  currentStreak: number;
  longestStreak: number;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

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

// Module-level caches, all invalidated/notified together — every value here
// changes at the same event (a game session/round ending), so one shared
// listener set is enough; consumers just re-read whichever getter they need.
let xpCache = readNumber(XP_KEY);
let achievementsCache = readJson<AchievementsState>(ACHIEVEMENTS_KEY, {});
let dailyStreakCache = readJson<DailyStreakState>(DAILY_STREAK_KEY, {
  lastPlayedDate: null,
  currentStreak: 0,
  longestStreak: 0,
});
let categoryPlayCountsCache = readJson<Record<string, number>>(
  CATEGORY_PLAY_COUNTS_KEY,
  {}
);
let totalPlayCountCache = readNumber(TOTAL_PLAY_COUNT_KEY);

const engagementListeners = new Set<() => void>();
function notifyEngagement(): void {
  for (const listener of engagementListeners) listener();
}

export function subscribeEngagement(listener: () => void): () => void {
  engagementListeners.add(listener);
  return () => engagementListeners.delete(listener);
}

export function getXP(): number {
  return xpCache;
}
export function getServerXPSnapshot(): number {
  return 0;
}

export function xpForLevel(level: number): number {
  return 50 * (level - 1) * level;
}
export function levelForXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function getLevel(): number {
  return levelForXp(xpCache);
}
export function getServerLevelSnapshot(): number {
  return 1;
}

export function getAchievements(): AchievementsState {
  return achievementsCache;
}
export function getServerAchievementsSnapshot(): AchievementsState {
  return {};
}
export function isAchievementUnlocked(id: AchievementId): boolean {
  return achievementsCache[id] !== undefined;
}

export function getDailyStreak(): DailyStreakState {
  return dailyStreakCache;
}

export function getCategoryPlayCounts(): Record<string, number> {
  return categoryPlayCountsCache;
}

export function getTotalPlayCount(): number {
  return totalPlayCountCache;
}
export function getServerTotalPlayCountSnapshot(): number {
  return 0;
}

function addXP(amount: number): void {
  const beforeLevel = levelForXp(xpCache);
  xpCache += amount;
  writeNumber(XP_KEY, xpCache);
  const afterLevel = levelForXp(xpCache);
  if (afterLevel > beforeLevel) {
    emitEngagementEvent({ type: "level-up", newLevel: afterLevel });
  }
  notifyEngagement();
}

// XP is only ever owned/mutated here. missions.ts (and any future Season
// Event / Weekly Mission system) never calls an XP function directly — it
// just emits "a mission completed" and this module reacts. That keeps XP
// bookkeeping in one place no matter how many features eventually award it.
subscribeEngagementEvents((event) => {
  if (event.type === "mission-completed") {
    addXP(event.xp);
  }
});

function unlockAchievement(id: AchievementId): void {
  if (isAchievementUnlocked(id)) {
    return;
  }
  achievementsCache = {
    ...achievementsCache,
    [id]: { unlockedAt: new Date().toISOString() },
  };
  writeJson(ACHIEVEMENTS_KEY, achievementsCache);
  emitEngagementEvent({
    type: "achievement-unlocked",
    achievementId: id,
    nameKo: ACHIEVEMENTS[id].nameKo,
  });
  addXP(ACHIEVEMENT_XP);
}

function todayLocalDateString(): string {
  return new Date().toLocaleDateString("en-CA");
}

function updateDailyStreak(): void {
  const today = todayLocalDateString();
  if (dailyStreakCache.lastPlayedDate === today) {
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const wasYesterday =
    dailyStreakCache.lastPlayedDate === yesterday.toLocaleDateString("en-CA");

  const currentStreak = wasYesterday ? dailyStreakCache.currentStreak + 1 : 1;
  dailyStreakCache = {
    lastPlayedDate: today,
    currentStreak,
    longestStreak: Math.max(dailyStreakCache.longestStreak, currentStreak),
  };
  writeJson(DAILY_STREAK_KEY, dailyStreakCache);
}

/** Hook 1 — fired once per game-page visit (see RecentlyPlayedRecorder). */
export function recordSessionStart(
  gameSlug: string,
  categorySlug: string | null
): void {
  totalPlayCountCache += 1;
  writeNumber(TOTAL_PLAY_COUNT_KEY, totalPlayCountCache);

  if (categorySlug) {
    categoryPlayCountsCache = {
      ...categoryPlayCountsCache,
      [categorySlug]: (categoryPlayCountsCache[categorySlug] ?? 0) + 1,
    };
    writeJson(CATEGORY_PLAY_COUNTS_KEY, categoryPlayCountsCache);
  }

  updateDailyStreak();
  addXP(PLAY_XP);

  if (totalPlayCountCache === 1) {
    unlockAchievement("first-play");
  }
  if ((categoryPlayCountsCache["puzzle"] ?? 0) >= 10) {
    unlockAchievement("puzzle-master");
  }
  if ((categoryPlayCountsCache["arcade"] ?? 0) >= 20) {
    unlockAchievement("retro-lover");
  }
  if (dailyStreakCache.currentStreak >= 7) {
    unlockAchievement("endless-player");
  }

  notifyEngagement();
}

/** Hook 2 — fired unconditionally every time a game reports a round's score. */
export function recordScoreReport(gameSlug: string, score: number): void {
  addXP(SCORE_REPORT_XP);

  if (gameSlug === "snake" && score >= 10000) {
    unlockAchievement("snake-master");
  }

  notifyEngagement();
}

/** Fired only when the round's score beats the existing personal best. */
export function recordNewBest(gameSlug: string, score: number): void {
  addXP(NEW_BEST_BONUS_XP);
  emitEngagementEvent({ type: "new-record", gameSlug, score });
  notifyEngagement();
}

/** Hook 3 — fired after a leaderboard submission resolves successfully. */
export function recordRankingSubmitted(): void {
  unlockAchievement("first-ranking");
  notifyEngagement();
}
