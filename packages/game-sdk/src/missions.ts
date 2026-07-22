// Daily Mission system — deliberately decoupled from engagement.ts (XP/level/
// achievements). This module only ever emits a "mission-completed" event; it
// never calls an XP-awarding function directly. engagement.ts owns XP and
// reacts to that event on its own (see the module-scope subscription there).
// That inversion means a future Season Event or Weekly Mission system can
// reuse the exact same XP pipeline just by emitting the same kind of event.
import { getLevel } from "./engagement";
import { emitEngagementEvent } from "./engagement-events";

const DAILY_MISSION_KEY = "play29:daily-mission";
const MISSION_XP = 30;

export type MissionType =
  | "PLAY_COUNT"
  | "CATEGORY_PLAY"
  | "SCORE"
  | "STREAK"
  | "CLEAR";

export type MissionHook = "session-start" | "score-report";

export interface MissionCheckContext {
  hook: MissionHook;
  gameSlug: string;
  categorySlug?: string | null;
  score?: number;
}

export interface MissionDefinition {
  id: string;
  title: string;
  type: MissionType;
  hook: MissionHook;
  target: number;
  xp: number;
  linkHref: string;
  /** Returns the mission's new `current` progress value given this event. */
  check: (ctx: MissionCheckContext, current: number) => number;
}

// Type-specific factories — adding a new mission is one call to one of
// these, never a new branch in the engine below. Exported so
// weekly-missions.ts can build its own mission pool from the same factories
// instead of redefining this shape.
export function playCountMission(
  id: string,
  title: string,
  gameSlug: string,
  target: number,
  xp = MISSION_XP
): MissionDefinition {
  return {
    id,
    title,
    type: "PLAY_COUNT",
    hook: "session-start",
    target,
    xp,
    linkHref: `/games/${gameSlug}`,
    check: (ctx, current) =>
      ctx.gameSlug === gameSlug ? current + 1 : current,
  };
}

export function categoryPlayMission(
  id: string,
  title: string,
  categorySlug: string,
  target: number,
  xp = MISSION_XP
): MissionDefinition {
  return {
    id,
    title,
    type: "CATEGORY_PLAY",
    hook: "session-start",
    target,
    xp,
    linkHref: `/categories/${categorySlug}`,
    check: (ctx, current) =>
      ctx.categorySlug === categorySlug ? current + 1 : current,
  };
}

export function anyPlayMission(
  id: string,
  title: string,
  target: number,
  xp = MISSION_XP
): MissionDefinition {
  return {
    id,
    title,
    type: "PLAY_COUNT",
    hook: "session-start",
    target,
    xp,
    linkHref: "/games",
    check: (_ctx, current) => current + 1,
  };
}

export function scoreMission(
  id: string,
  title: string,
  gameSlug: string,
  target: number,
  xp = MISSION_XP
): MissionDefinition {
  return {
    id,
    title,
    type: "SCORE",
    hook: "score-report",
    target,
    xp,
    linkHref: `/games/${gameSlug}`,
    check: (ctx, current) =>
      ctx.gameSlug === gameSlug ? Math.max(current, ctx.score ?? 0) : current,
  };
}

// For games that only call reportScore on an actual win (e.g. Memory), the
// score-report itself is the "clear" signal — no separate win/loss flag
// needed.
export function clearMission(
  id: string,
  title: string,
  gameSlug: string,
  xp = MISSION_XP
): MissionDefinition {
  return {
    id,
    title,
    type: "CLEAR",
    hook: "score-report",
    target: 1,
    xp,
    linkHref: `/games/${gameSlug}`,
    check: (ctx, current) => (ctx.gameSlug === gameSlug ? 1 : current),
  };
}

// STREAK is defined for future missions (e.g. "3일 연속 접속") — no pool
// entry uses it yet, since daily-streak-based achievements already cover
// that ground this sprint.

export type MissionTier = "tier1" | "tier2" | "tier3";

export function getMissionTierForLevel(level: number): MissionTier {
  if (level >= 30) return "tier3";
  if (level >= 10) return "tier2";
  return "tier1";
}

const TIER1_POOL: MissionDefinition[] = [
  playCountMission("tier1-snake-play", "Snake 1회 플레이", "snake", 1),
  playCountMission("tier1-2048-play", "2048 플레이", "2048", 1),
  anyPlayMission("tier1-any-3", "아무 게임 3회 플레이", 3),
  categoryPlayMission("tier1-puzzle-3", "퍼즐 게임 3회 플레이", "puzzle", 3),
  clearMission("tier1-memory-clear", "Memory 클리어", "memory"),
];

const TIER2_POOL: MissionDefinition[] = [
  scoreMission("tier2-snake-10000", "Snake 10,000점 달성", "snake", 10000),
  scoreMission("tier2-2048-12000", "2048 12,000점 달성", "2048", 12000),
  categoryPlayMission("tier2-arcade-5", "Arcade 게임 5회 플레이", "arcade", 5),
  categoryPlayMission("tier2-puzzle-10", "퍼즐 게임 10회 플레이", "puzzle", 10),
];

const TIER3_POOL: MissionDefinition[] = [
  categoryPlayMission("tier3-puzzle-15", "퍼즐 게임 15회 플레이", "puzzle", 15),
  categoryPlayMission("tier3-arcade-10", "Arcade 게임 10회 플레이", "arcade", 10),
  scoreMission("tier3-snake-20000", "Snake 20,000점 달성", "snake", 20000),
  anyPlayMission("tier3-any-10", "아무 게임이나 10회 플레이", 10),
];

const TIER_POOLS: Record<MissionTier, MissionDefinition[]> = {
  tier1: TIER1_POOL,
  tier2: TIER2_POOL,
  tier3: TIER3_POOL,
};

const ALL_MISSIONS: Record<string, MissionDefinition> = Object.fromEntries(
  [...TIER1_POOL, ...TIER2_POOL, ...TIER3_POOL].map((m) => [m.id, m])
);

export function getMissionDefinition(id: string): MissionDefinition | undefined {
  return ALL_MISSIONS[id];
}

// Deterministic per (date, tier) — same seed always picks the same 3
// missions, so a reload or a second tab never shows a different set.
// Exported so weekly-missions.ts can seed from an ISO week string instead
// of a date string using the exact same hash/PRNG/shuffle.
export function seedFromDate(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickThree(pool: MissionDefinition[], rng: () => number): string[] {
  const ids = pool.map((m) => m.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids.slice(0, 3);
}

// Exported — weekly-missions.ts's "has the ISO week rolled over" check needs
// the same local-date notion "today" uses, just compared at week grain.
export function todayLocalDateString(): string {
  return new Date().toLocaleDateString("en-CA");
}

export interface MissionProgress {
  current: number;
  target: number;
}

export interface DailyMissionState {
  date: string;
  tier: MissionTier;
  missionIds: [string, string, string];
  progress: Record<string, MissionProgress>;
  completed: string[];
}

function readDailyMission(): DailyMissionState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(DAILY_MISSION_KEY);
    return raw ? (JSON.parse(raw) as DailyMissionState) : null;
  } catch {
    return null;
  }
}

function writeDailyMission(state: DailyMissionState): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DAILY_MISSION_KEY, JSON.stringify(state));
  }
}

function generateDailyMission(level: number): DailyMissionState {
  const date = todayLocalDateString();
  const tier = getMissionTierForLevel(level);
  const rng = mulberry32(seedFromDate(date + tier));
  const missionIds = pickThree(TIER_POOLS[tier], rng) as [string, string, string];
  const progress: Record<string, MissionProgress> = {};
  for (const id of missionIds) {
    progress[id] = { current: 0, target: ALL_MISSIONS[id]!.target };
  }
  return { date, tier, missionIds, progress, completed: [] };
}

// Lazy-fill-and-persist-on-first-access, same shape as getDeviceId()'s
// existing precedent elsewhere in this package — not a "pure" getter, but
// idempotent (repeated calls on the same day return the same reference).
let dailyMissionCache: DailyMissionState | null = readDailyMission();

function ensureFreshMissionState(): DailyMissionState {
  const today = todayLocalDateString();
  if (dailyMissionCache && dailyMissionCache.date === today) {
    return dailyMissionCache;
  }
  const fresh = generateDailyMission(getLevel());
  dailyMissionCache = fresh;
  writeDailyMission(fresh);
  return fresh;
}

const EMPTY_DAILY_MISSION: DailyMissionState = {
  date: "",
  tier: "tier1",
  missionIds: ["", "", ""],
  progress: {},
  completed: [],
};

export function getDailyMission(): DailyMissionState {
  return ensureFreshMissionState();
}

export function getServerDailyMissionSnapshot(): DailyMissionState {
  return EMPTY_DAILY_MISSION;
}

export function isDailyChallengeComplete(state: DailyMissionState): boolean {
  return state.completed.length >= state.missionIds.length;
}

const missionListeners = new Set<() => void>();
function notifyMissions(): void {
  for (const listener of missionListeners) listener();
}
export function subscribeMissions(listener: () => void): () => void {
  missionListeners.add(listener);
  return () => missionListeners.delete(listener);
}

function processMissionUpdate(ctx: MissionCheckContext): void {
  const state = ensureFreshMissionState();
  const nextProgress = { ...state.progress };
  const nextCompleted = [...state.completed];
  let changed = false;

  for (const id of state.missionIds) {
    if (nextCompleted.includes(id)) {
      continue;
    }
    const definition = ALL_MISSIONS[id];
    if (!definition || definition.hook !== ctx.hook) {
      continue;
    }

    const prevCurrent = nextProgress[id]?.current ?? 0;
    const newCurrent = definition.check(ctx, prevCurrent);
    if (newCurrent === prevCurrent) {
      continue;
    }

    changed = true;
    nextProgress[id] = { current: newCurrent, target: definition.target };

    if (newCurrent >= definition.target) {
      nextCompleted.push(id);
      emitEngagementEvent({
        type: "mission-completed",
        missionId: id,
        title: definition.title,
        xp: definition.xp,
      });
    }
  }

  if (changed) {
    const next: DailyMissionState = {
      ...state,
      progress: nextProgress,
      completed: nextCompleted,
    };
    dailyMissionCache = next;
    writeDailyMission(next);
    notifyMissions();
  }
}

/** Hook 1 — call alongside recordSessionStart. */
export function recordMissionSessionStart(
  gameSlug: string,
  categorySlug: string | null
): void {
  processMissionUpdate({ hook: "session-start", gameSlug, categorySlug });
}

/** Hook 2 — call alongside recordScoreReport. */
export function recordMissionScoreReport(gameSlug: string, score: number): void {
  processMissionUpdate({ hook: "score-report", gameSlug, score });
}
