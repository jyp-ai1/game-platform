import { supabase } from "./client";

export interface LeaderboardEntry {
  nickname: string;
  score: number;
}

export type LeaderboardPeriod = "today" | "weekly" | "all";

export async function submitScore(
  gameSlug: string,
  nickname: string,
  score: number,
  deviceId: string
): Promise<void> {
  const { error } = await supabase.rpc("submit_score", {
    p_game_slug: gameSlug,
    p_device_id: deviceId,
    p_nickname: nickname,
    p_score: score,
  });

  if (error) {
    throw new Error(`Failed to submit score for "${gameSlug}": ${error.message}`);
  }
}

function startOfTodayIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

// Monday-start week, mirroring startOfTodayIso()'s local-midnight shape.
// get_leaderboard's p_since already accepts an arbitrary cutoff -- no RPC
// change needed to add a "weekly" period, only this client-side helper.
function startOfWeekIso(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  return monday.toISOString();
}

function periodSince(period: LeaderboardPeriod): string | null {
  if (period === "today") return startOfTodayIso();
  if (period === "weekly") return startOfWeekIso();
  return null;
}

export async function getLeaderboard(
  gameSlug: string,
  period: LeaderboardPeriod = "all",
  limit = 100
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_game_slug: gameSlug,
    p_since: periodSince(period),
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to fetch leaderboard for "${gameSlug}": ${error.message}`);
  }

  return (data ?? []) as LeaderboardEntry[];
}

// null means "unranked" -- either no score submitted yet for this device, or
// this device has no score within the period's cutoff.
export async function getMyRank(
  gameSlug: string,
  deviceId: string,
  period: LeaderboardPeriod = "all"
): Promise<number | null> {
  const { data, error } = await supabase.rpc("get_my_rank", {
    p_game_slug: gameSlug,
    p_device_id: deviceId,
    p_since: periodSince(period),
  });

  if (error) {
    throw new Error(`Failed to fetch rank for "${gameSlug}": ${error.message}`);
  }

  return (data as number | null) ?? null;
}
