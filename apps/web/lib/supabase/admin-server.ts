import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

// Service-role client for /admin server routes only — never import from client components.
export function getAdminSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}

export type TodayStats = {
  dau: number;
  session_starts: number;
  score_submits: number;
  save_created: number;
  errors: number;
  recent_plays: Array<{
    game_slug: string;
    device_id: string;
    seconds_ago: number;
  }>;
};

export type DailyStatRow = {
  day: string;
  dau: number;
  session_starts: number;
  score_submits: number;
  save_created: number;
  errors: number;
};

export async function fetchTodayStats(): Promise<TodayStats | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_analytics_today_stats");
  if (error) {
    console.error("get_analytics_today_stats:", error.message);
    return null;
  }

  return data as TodayStats;
}

export async function fetchDailyStats(days = 30): Promise<DailyStatRow[]> {
  const supabase = getAdminSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_analytics_daily_stats", {
    p_days: days,
  });
  if (error) {
    console.error("get_analytics_daily_stats:", error.message);
    return [];
  }

  return (data ?? []) as DailyStatRow[];
}

export type GamePlayRow = {
  slug: string;
  title: string;
  play_count: number;
};

export async function fetchTopGames(limit = 10): Promise<GamePlayRow[]> {
  const supabase = getAdminSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("games")
    .select("slug, title, play_count")
    .eq("status", "ACTIVE")
    .order("play_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetchTopGames:", error.message);
    return [];
  }

  return data ?? [];
}
