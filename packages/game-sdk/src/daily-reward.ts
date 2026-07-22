// Daily Reward — reuses engagement.ts's existing DailyStreakState instead of
// tracking a second streak. Same XP-ownership inversion as missions.ts: this
// module never awards XP directly, it only emits "daily-reward-claimed" and
// lets engagement.ts/season.ts react independently.
import { getDailyStreak } from "./engagement";
import { emitEngagementEvent } from "./engagement-events";

const DAILY_REWARD_CLAIMED_KEY = "play29:daily-reward-claimed";
const BASE_REWARD_XP = 20;
const STREAK_BONUS_DAY = 7;
const STREAK_BONUS_XP = 100;

function todayLocalDateString(): string {
  return new Date().toLocaleDateString("en-CA");
}

function readClaimedDate(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(DAILY_REWARD_CLAIMED_KEY);
}

function writeClaimedDate(date: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DAILY_REWARD_CLAIMED_KEY, date);
  }
}

export function hasClaimedTodayReward(): boolean {
  return readClaimedDate() === todayLocalDateString();
}

/**
 * Auto-claims the first time this is called on a given day — no separate
 * click needed. Call alongside `recordSessionStart` (after it), so
 * `engagement.ts`'s `updateDailyStreak()` has already advanced today's
 * streak by the time this reads it. No-ops if already claimed today.
 */
export function claimDailyReward(): void {
  if (hasClaimedTodayReward()) {
    return;
  }
  const { currentStreak } = getDailyStreak();
  const xp = currentStreak >= STREAK_BONUS_DAY ? STREAK_BONUS_XP : BASE_REWARD_XP;
  writeClaimedDate(todayLocalDateString());
  emitEngagementEvent({
    type: "daily-reward-claimed",
    xp,
    streakDay: currentStreak,
  });
}
