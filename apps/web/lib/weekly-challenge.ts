/** Weekly challenge state — local MVP for Sprint17 Epic5. */
const WEEKLY_KEY = "play29:weekly-challenge";

export interface WeeklyChallengeState {
  weekId: string;
  targetPlays: number;
  completedPlays: number;
  featuredSlug: string;
}

function isoWeekId(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${week}`;
}

export function getWeeklyChallenge(): WeeklyChallengeState {
  if (typeof window === "undefined") {
    return { weekId: isoWeekId(), targetPlays: 10, completedPlays: 0, featuredSlug: "2048" };
  }
  try {
    const raw = window.localStorage.getItem(WEEKLY_KEY);
    const current = isoWeekId();
    if (raw) {
      const parsed = JSON.parse(raw) as WeeklyChallengeState;
      if (parsed.weekId === current) return parsed;
    }
  } catch {
    /* fallthrough */
  }
  const fresh: WeeklyChallengeState = {
    weekId: isoWeekId(),
    targetPlays: 10,
    completedPlays: 0,
    featuredSlug: "2048",
  };
  window.localStorage.setItem(WEEKLY_KEY, JSON.stringify(fresh));
  return fresh;
}

export function recordWeeklyPlay(): WeeklyChallengeState {
  const state = getWeeklyChallenge();
  state.completedPlays = Math.min(state.targetPlays, state.completedPlays + 1);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(WEEKLY_KEY, JSON.stringify(state));
  }
  return state;
}
