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

export type DashboardKpis = {
  dau: number;
  wau: number;
  mau: number;
  session_starts: number;
  game_starts: number;
  ranking_submits: number;
  errors: number;
  new_users: number;
  returning_users: number;
};

export type DashboardKpisExtended = DashboardKpis & {
  stickiness: number;
  avg_session_events: number;
  avg_play_time_sec: number;
  avg_score: number;
  game_completions: number;
  save_count: number;
  resume_count: number;
  resume_rate: number;
};

export type DashboardPeriod = "today" | "week" | "month" | "all";

export async function fetchDashboardKpis(
  period: DashboardPeriod = "today"
): Promise<DashboardKpis | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_dashboard_kpis", {
    p_period: period,
  });
  if (error) {
    console.error("get_dashboard_kpis:", error.message);
    return null;
  }

  return data as DashboardKpis;
}

export async function fetchDashboardKpisExtended(
  period: DashboardPeriod = "today"
): Promise<DashboardKpisExtended | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_dashboard_kpis_extended", {
    p_period: period,
  });
  if (error) {
    console.error("get_dashboard_kpis_extended:", error.message);
    return fetchDashboardKpis(period) as Promise<DashboardKpisExtended | null>;
  }

  return data as DashboardKpisExtended;
}

export type SeoAuditStats = {
  sitemap_pages: number;
  indexable_games: number;
  indexable_categories: number;
  meta_missing: number;
  og_missing: number;
  hidden_games: number;
  maintenance_games: number;
  verification: Record<string, string> | null;
  last_lighthouse: {
    url: string;
    performance: number;
    accessibility: number;
    best_practices: number;
    seo: number;
    created_at: string;
  } | null;
};

export async function fetchSeoAuditStats(): Promise<SeoAuditStats | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_seo_audit_stats");
  if (error) {
    console.error("get_seo_audit_stats:", error.message);
    return null;
  }

  return data as SeoAuditStats;
}

export async function fetchSystemHealth(): Promise<Record<string, string> | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_system_health_summary");
  if (error) {
    console.error("get_system_health_summary:", error.message);
    return null;
  }

  return data as Record<string, string>;
}

export async function fetchPlayerFunnel(
  period: DashboardPeriod = "today"
): Promise<Record<string, number> | null> {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_player_funnel", {
    p_period: period,
  });
  if (error) {
    console.error("get_player_funnel:", error.message);
    return null;
  }

  return data as Record<string, number>;
}

export type CohortRow = {
  cohort_date: string;
  cohort_size: number;
  d1_pct: number;
  d7_pct: number;
  d30_pct: number;
};

export async function fetchCohortRetention(days = 14): Promise<CohortRow[]> {
  const supabase = getAdminSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_cohort_retention", {
    p_days: days,
  });
  if (error) {
    console.error("get_cohort_retention:", error.message);
    return [];
  }

  return (data ?? []) as CohortRow[];
}

export type HeatmapCell = { dow: number; hour: number; count: number };

export async function fetchActivityHeatmap(days = 30): Promise<HeatmapCell[]> {
  const supabase = getAdminSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_activity_heatmap", {
    p_days: days,
  });
  if (error) {
    console.error("get_activity_heatmap:", error.message);
    return [];
  }

  return (data ?? []) as HeatmapCell[];
}

export async function fetchTopGamesAnalytics(
  period: DashboardPeriod = "today",
  limit = 10
): Promise<Array<{ slug: string; title: string; plays: number }>> {
  const supabase = getAdminSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_top_games_analytics", {
    p_period: period,
    p_limit: limit,
  });
  if (error) {
    console.error("get_top_games_analytics:", error.message);
    return fetchTopGames(limit).then((rows) =>
      rows.map((g) => ({ slug: g.slug, title: g.title, plays: g.play_count }))
    );
  }

  return (data ?? []) as Array<{ slug: string; title: string; plays: number }>;
}

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

function periodSinceIso(period: DashboardPeriod): string {
  const now = new Date();
  const d = new Date(now);
  if (period === "today") {
    d.setUTCHours(0, 0, 0, 0);
  } else if (period === "week") {
    d.setUTCDate(d.getUTCDate() - 7);
  } else if (period === "month") {
    d.setUTCDate(d.getUTCDate() - 30);
  } else {
    d.setUTCFullYear(2020, 0, 1);
  }
  return d.toISOString();
}

export async function fetchEventCount(
  eventType: string,
  period: DashboardPeriod = "week"
): Promise<number> {
  const supabase = getAdminSupabase();
  if (!supabase) return 0;

  const since = periodSinceIso(period);
  const { count, error } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_type", eventType)
    .gte("created_at", since);

  if (error) {
    console.error("fetchEventCount:", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function fetchAllGamesByPlays(
  period: DashboardPeriod = "week",
  limit = 50
): Promise<Array<{ slug: string; title: string; plays: number }>> {
  return fetchTopGamesAnalytics(period, limit);
}

export type Sprint13GameKpiRow = {
  slug: string;
  title: string;
  plays: number;
  finishes: number;
  favorites: number;
  resumes: number;
  retries: number;
  ranking_submits: number;
  avg_score: number;
  avg_play_time_sec: number;
  finish_rate_pct: number;
};

/** @deprecated Use fetchGameKpis — kept for Sprint 13 call sites */
export async function fetchSprint13GameKpis(
  slugs: readonly string[],
  period: DashboardPeriod = "week"
): Promise<Sprint13GameKpiRow[]> {
  return fetchGameKpis(slugs, period);
}

export async function fetchGameKpis(
  slugs: readonly string[],
  period: DashboardPeriod = "week"
): Promise<Sprint13GameKpiRow[]> {
  const supabase = getAdminSupabase();
  if (!supabase || slugs.length === 0) return [];

  const { data, error } = await supabase.rpc("get_game_kpis_batch", {
    p_period: period,
    p_slugs: [...slugs],
  });
  if (error) {
    console.error("get_game_kpis_batch:", error.message);
    return [];
  }

  return (data ?? []) as Sprint13GameKpiRow[];
}
