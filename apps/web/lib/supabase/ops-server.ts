import { getAdminSupabase } from "./admin-server";

export type OpsRealtimeStats = {
  online_users: number;
  playing_now: number;
  today_plays: number;
  today_scores: number;
  errors_1h: number;
  errors_today: number;
  active_games: Array<{ game_slug: string; plays: number }>;
  recent_errors: Array<{
    event_type: string;
    game_slug: string | null;
    metadata: Record<string, unknown>;
    seconds_ago: number;
  }>;
  checked_at: string;
};

export type OpsErrorSummary = {
  total: number;
  by_type: Record<string, number>;
  by_game: Array<{ game_slug: string; cnt: number }>;
  recent: Array<{
    id: string;
    event_type: string;
    game_slug: string | null;
    device_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
};

export type PlayerCrmRow = {
  device_id: string;
  nickname: string | null;
  status: string;
  first_seen: string;
  last_seen: string;
  total_plays: number;
  admin_memo: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
};

export type PlayerCrmSearch = {
  rows: PlayerCrmRow[];
  total: number;
};

export type PlayerCrmDetail = {
  player: PlayerCrmRow | null;
  scores: Array<{
    game_slug: string;
    nickname: string;
    score: number;
    updated_at: string;
  }>;
  recent_sessions: Array<{
    game_slug: string;
    started_at: string;
    ended_at: string | null;
    score: number | null;
    completed: boolean;
  }>;
  activity: Array<{
    event_type: string;
    game_slug: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
};

export type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  label: string;
  description: string | null;
  updated_at: string;
};

export type MonthlyOpsReport = {
  month: string;
  dau_avg: number;
  total_plays: number;
  total_scores: number;
  new_players: number;
  top_games: Array<{ game_slug: string; plays: number }>;
  errors: number;
};

export async function fetchOpsRealtimeStats(): Promise<OpsRealtimeStats | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_ops_realtime_stats");
  if (error) {
    console.error("get_ops_realtime_stats:", error.message);
    return null;
  }

  return data as OpsRealtimeStats;
}

export async function fetchOpsErrorSummary(hours = 24): Promise<OpsErrorSummary | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_ops_error_summary", {
    p_hours: hours,
  });
  if (error) {
    console.error("get_ops_error_summary:", error.message);
    return null;
  }

  return data as OpsErrorSummary;
}

export async function searchPlayersCrm(
  query = "",
  status: string | null = null,
  limit = 50,
  offset = 0
): Promise<PlayerCrmSearch | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("search_players_crm", {
    p_query: query,
    p_status: status,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.error("search_players_crm:", error.message);
    return null;
  }

  return data as PlayerCrmSearch;
}

export async function fetchPlayerCrmDetail(
  deviceId: string
): Promise<PlayerCrmDetail | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_player_crm_detail", {
    p_device_id: deviceId,
  });
  if (error) {
    console.error("get_player_crm_detail:", error.message);
    return null;
  }

  return data as PlayerCrmDetail;
}

export async function fetchFeatureFlags(): Promise<FeatureFlagRow[]> {
  const supabase = getAdminSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("feature_flags")
    .select("*")
    .order("key");

  if (error) {
    console.error("fetchFeatureFlags:", error.message);
    return [];
  }

  return (data ?? []) as FeatureFlagRow[];
}

export async function fetchMonthlyOpsReport(
  month?: string
): Promise<MonthlyOpsReport | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_monthly_ops_report", {
    p_month: month ?? undefined,
  });
  if (error) {
    console.error("get_monthly_ops_report:", error.message);
    return null;
  }

  return data as MonthlyOpsReport;
}

export async function fetchNotificationCounts(): Promise<{
  notices: number;
  banners: number;
  events: number;
  featured: number;
}> {
  const supabase = getAdminSupabase();
  if (!supabase) {
    return { notices: 0, banners: 0, events: 0, featured: 0 };
  }

  const [notices, banners, events, featured] = await Promise.all([
    supabase.from("cms_notices").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("cms_banners").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("cms_events").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("cms_featured_games").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return {
    notices: notices.count ?? 0,
    banners: banners.count ?? 0,
    events: events.count ?? 0,
    featured: featured.count ?? 0,
  };
}

export async function fetchDailyStatsForExport(days = 30) {
  const supabase = getAdminSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_analytics_daily_stats", {
    p_days: days,
  });
  if (error) {
    console.error("get_analytics_daily_stats:", error.message);
    return [];
  }

  return data ?? [];
}
