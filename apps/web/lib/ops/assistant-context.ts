import {
  fetchDashboardKpisExtended,
  fetchPlayerFunnel,
  fetchTopGamesAnalytics,
} from "@/lib/supabase/admin-server";
import {
  fetchMonthlyOpsReport,
  fetchOpsErrorSummary,
  fetchOpsRealtimeStats,
} from "@/lib/supabase/ops-server";

export type OpsContext = {
  generated_at: string;
  realtime: Awaited<ReturnType<typeof fetchOpsRealtimeStats>>;
  errors: Awaited<ReturnType<typeof fetchOpsErrorSummary>>;
  kpis: Awaited<ReturnType<typeof fetchDashboardKpisExtended>>;
  monthly: Awaited<ReturnType<typeof fetchMonthlyOpsReport>>;
  funnel: Awaited<ReturnType<typeof fetchPlayerFunnel>>;
  top_games: Awaited<ReturnType<typeof fetchTopGamesAnalytics>>;
};

export async function buildOpsContext(): Promise<OpsContext> {
  const [realtime, errors, kpis, monthly, funnel, top_games] = await Promise.all([
    fetchOpsRealtimeStats(),
    fetchOpsErrorSummary(24),
    fetchDashboardKpisExtended("today"),
    fetchMonthlyOpsReport(),
    fetchPlayerFunnel("week"),
    fetchTopGamesAnalytics("week", 5),
  ]);

  return {
    generated_at: new Date().toISOString(),
    realtime,
    errors,
    kpis,
    monthly,
    funnel,
    top_games,
  };
}

export function summarizeOpsContext(ctx: OpsContext): string {
  const lines: string[] = [
    `generated_at: ${ctx.generated_at}`,
    ctx.realtime
      ? `online_users: ${ctx.realtime.online_users}, playing_now: ${ctx.realtime.playing_now}, today_plays: ${ctx.realtime.today_plays}, errors_1h: ${ctx.realtime.errors_1h}`
      : "realtime: unavailable",
    ctx.kpis
      ? `dau: ${ctx.kpis.dau}, wau: ${ctx.kpis.wau}, mau: ${ctx.kpis.mau}, stickiness: ${ctx.kpis.stickiness}%, returning: ${ctx.kpis.returning_users}`
      : "kpis: unavailable",
    ctx.errors ? `errors_24h: ${ctx.errors.total}` : "errors: unavailable",
    ctx.monthly
      ? `month_plays: ${ctx.monthly.total_plays}, new_players: ${ctx.monthly.new_players}`
      : "monthly: unavailable",
    ctx.top_games.length
      ? `top_games_week: ${ctx.top_games.map((g) => `${g.slug}(${g.plays})`).join(", ")}`
      : "top_games: none",
  ];
  return lines.join("\n");
}
