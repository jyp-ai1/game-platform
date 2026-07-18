import { supabase } from "./client";

export interface LeaderboardEntry {
  nickname: string;
  score: number;
}

export type LeaderboardPeriod = "today" | "all";

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

export async function getLeaderboard(
  gameSlug: string,
  period: LeaderboardPeriod = "all",
  limit = 100
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_game_slug: gameSlug,
    p_since: period === "today" ? startOfTodayIso() : null,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to fetch leaderboard for "${gameSlug}": ${error.message}`);
  }

  return (data ?? []) as LeaderboardEntry[];
}
