// Weekly Mission — a close copy of missions.ts's shape, keyed by ISO week
// instead of local date, and holding a single cumulative mission instead of
// a set of 3. Reuses missions.ts's factories/seed-hash/shuffle verbatim so
// there's exactly one deterministic-selection implementation in the
// package, not two.
import { getLevel } from "./engagement";
import { emitEngagementEvent } from "./engagement-events";
import {
  anyPlayMission,
  categoryPlayMission,
  getMissionTierForLevel,
  mulberry32,
  pickThree,
  seedFromDate,
  type MissionCheckContext,
  type MissionDefinition,
  type MissionProgress,
  type MissionTier,
} from "./missions";

const WEEKLY_MISSION_KEY = "play29:weekly-mission";
const WEEKLY_MISSION_XP = 80;

// Candidate pools per tier — larger targets than the daily pools (20-40
// plays vs. daily's 1-3), reflecting a week's worth of play instead of one
// session's.
const WEEKLY_TIER1_POOL: MissionDefinition[] = [
  anyPlayMission("weekly-tier1-any-20", "이번 주 아무 게임 20회 플레이", 20, WEEKLY_MISSION_XP),
  categoryPlayMission("weekly-tier1-puzzle-15", "이번 주 퍼즐 게임 15회 플레이", "puzzle", 15, WEEKLY_MISSION_XP),
];

const WEEKLY_TIER2_POOL: MissionDefinition[] = [
  anyPlayMission("weekly-tier2-any-30", "이번 주 아무 게임 30회 플레이", 30, WEEKLY_MISSION_XP),
  categoryPlayMission("weekly-tier2-arcade-20", "이번 주 Arcade 게임 20회 플레이", "arcade", 20, WEEKLY_MISSION_XP),
];

const WEEKLY_TIER3_POOL: MissionDefinition[] = [
  anyPlayMission("weekly-tier3-any-40", "이번 주 아무 게임이나 40회 플레이", 40, WEEKLY_MISSION_XP),
  categoryPlayMission("weekly-tier3-puzzle-30", "이번 주 퍼즐 게임 30회 플레이", "puzzle", 30, WEEKLY_MISSION_XP),
];

const WEEKLY_TIER_POOLS: Record<MissionTier, MissionDefinition[]> = {
  tier1: WEEKLY_TIER1_POOL,
  tier2: WEEKLY_TIER2_POOL,
  tier3: WEEKLY_TIER3_POOL,
};

const ALL_WEEKLY_MISSIONS: Record<string, MissionDefinition> = Object.fromEntries(
  [...WEEKLY_TIER1_POOL, ...WEEKLY_TIER2_POOL, ...WEEKLY_TIER3_POOL].map((m) => [m.id, m])
);

export function getWeeklyMissionDefinition(id: string): MissionDefinition | undefined {
  return ALL_WEEKLY_MISSIONS[id];
}

// ISO 8601 week string, e.g. "2026-W04" — Monday-start, week 1 is the week
// containing the year's first Thursday. Same week number for every day in
// that week regardless of which year-boundary edge cases land where, which
// is exactly what makes it a stable, reload-safe seed input.
export function isoWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export interface WeeklyMissionState {
  week: string;
  tier: MissionTier;
  missionId: string;
  progress: MissionProgress;
  completed: boolean;
}

function readWeeklyMission(): WeeklyMissionState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(WEEKLY_MISSION_KEY);
    return raw ? (JSON.parse(raw) as WeeklyMissionState) : null;
  } catch {
    return null;
  }
}

function writeWeeklyMission(state: WeeklyMissionState): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(WEEKLY_MISSION_KEY, JSON.stringify(state));
  }
}

function generateWeeklyMission(level: number): WeeklyMissionState {
  const week = isoWeekString(new Date());
  const tier = getMissionTierForLevel(level);
  const rng = mulberry32(seedFromDate(week + tier));
  const pool = WEEKLY_TIER_POOLS[tier];
  const [missionId] = pickThree(pool, rng);
  const definition = ALL_WEEKLY_MISSIONS[missionId!]!;
  return {
    week,
    tier,
    missionId: missionId!,
    progress: { current: 0, target: definition.target },
    completed: false,
  };
}

let weeklyMissionCache: WeeklyMissionState | null = readWeeklyMission();

function ensureFreshWeeklyMissionState(): WeeklyMissionState {
  const week = isoWeekString(new Date());
  if (weeklyMissionCache && weeklyMissionCache.week === week) {
    return weeklyMissionCache;
  }
  const fresh = generateWeeklyMission(getLevel());
  weeklyMissionCache = fresh;
  writeWeeklyMission(fresh);
  return fresh;
}

const EMPTY_WEEKLY_MISSION: WeeklyMissionState = {
  week: "",
  tier: "tier1",
  missionId: "",
  progress: { current: 0, target: 0 },
  completed: false,
};

export function getWeeklyMission(): WeeklyMissionState {
  return ensureFreshWeeklyMissionState();
}

export function getServerWeeklyMissionSnapshot(): WeeklyMissionState {
  return EMPTY_WEEKLY_MISSION;
}

export function isWeeklyMissionComplete(state: WeeklyMissionState): boolean {
  return state.completed;
}

const weeklyMissionListeners = new Set<() => void>();
function notifyWeeklyMission(): void {
  for (const listener of weeklyMissionListeners) listener();
}
export function subscribeWeeklyMission(listener: () => void): () => void {
  weeklyMissionListeners.add(listener);
  return () => weeklyMissionListeners.delete(listener);
}

function processWeeklyMissionUpdate(ctx: MissionCheckContext): void {
  const state = ensureFreshWeeklyMissionState();
  if (state.completed) {
    return;
  }
  const definition = ALL_WEEKLY_MISSIONS[state.missionId];
  if (!definition || definition.hook !== ctx.hook) {
    return;
  }

  const newCurrent = definition.check(ctx, state.progress.current);
  if (newCurrent === state.progress.current) {
    return;
  }

  const completed = newCurrent >= definition.target;
  const next: WeeklyMissionState = {
    ...state,
    progress: { current: newCurrent, target: definition.target },
    completed,
  };
  weeklyMissionCache = next;
  writeWeeklyMission(next);

  if (completed) {
    emitEngagementEvent({
      type: "weekly-mission-completed",
      missionId: definition.id,
      title: definition.title,
      xp: definition.xp,
    });
  }

  notifyWeeklyMission();
}

/** Hook 1 — call alongside recordSessionStart / recordMissionSessionStart. */
export function recordWeeklyMissionSessionStart(
  gameSlug: string,
  categorySlug: string | null
): void {
  processWeeklyMissionUpdate({ hook: "session-start", gameSlug, categorySlug });
}

/** Hook 2 — call alongside recordScoreReport / recordMissionScoreReport. */
export function recordWeeklyMissionScoreReport(gameSlug: string, score: number): void {
  processWeeklyMissionUpdate({ hook: "score-report", gameSlug, score });
}
