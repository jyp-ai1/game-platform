import { Suspense } from "react";

import { ActivityHeatmap } from "@/components/admin/activity-heatmap";
import { GameRankingsPanel } from "@/components/admin/game-rankings-panel";
import { FunnelChart, type FunnelData } from "@/components/admin/funnel-chart";
import {
  DashboardPeriodTabs,
  type DashboardPeriod,
} from "@/components/admin/dashboard-period-tabs";
import {
  SoftLaunchKpiCards,
  SoftLaunchOpsLinks,
} from "@/components/admin/soft-launch-panel";
import { computeSoftLaunchRates } from "@/lib/admin/soft-launch-metrics";
import {
  fetchActivityHeatmap,
  fetchAllGamesByPlays,
  fetchDashboardKpisExtended,
  fetchEventCount,
  fetchPlayerFunnel,
  fetchSprint13GameKpis,
  fetchTopGamesAnalytics,
  type DashboardPeriod as ServerPeriod,
} from "@/lib/supabase/admin-server";
import { SPRINT_13_NEW_GAME_SLUGS } from "@/lib/sprint-13-games";
import { Sprint13GameKpiPanel } from "@/components/admin/sprint13-game-kpi-panel";

export const metadata = { title: "Analytics" };

function parsePeriod(raw?: string): ServerPeriod {
  if (raw === "week" || raw === "month" || raw === "all") return raw;
  return "week";
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);

  const [funnel, heatmap, topGames, allGames, kpis, missionCount, sprint13Kpis] =
    await Promise.all([
      fetchPlayerFunnel(period),
      fetchActivityHeatmap(30),
      fetchTopGamesAnalytics(period, 15),
      fetchAllGamesByPlays(period, 50),
      fetchDashboardKpisExtended(period),
      fetchEventCount("mission_complete", period),
      fetchSprint13GameKpis(SPRINT_13_NEW_GAME_SLUGS, period),
    ]);

  const funnelData: FunnelData = {
    session: funnel?.session ?? 0,
    game_start: funnel?.game_start ?? 0,
    game_end: funnel?.game_end ?? 0,
    score_submit: funnel?.score_submit ?? 0,
    ranking_submit: funnel?.ranking_submit ?? 0,
    favorite: funnel?.favorite ?? 0,
  };

  const rates = computeSoftLaunchRates(
    funnel,
    kpis?.dau ?? 0,
    missionCount
  );

  const top5 = allGames.slice(0, 5);
  const bottom5 = [...allGames]
    .sort((a, b) => a.plays - b.plays)
    .slice(0, 5);

  const maxPlays = topGames[0]?.plays ?? 1;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Game Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Soft Launch KPI · Funnel · Top/Bottom 5
          </p>
        </div>
        <Suspense fallback={<div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />}>
          <DashboardPeriodTabs
            current={period as DashboardPeriod}
            basePath="/admin/analytics"
          />
        </Suspense>
      </div>

      <SoftLaunchKpiCards dau={kpis?.dau ?? 0} rates={rates} />

      <Sprint13GameKpiPanel rows={sprint13Kpis} />

      <GameRankingsPanel topGames={top5} bottomGames={bottom5} />

      <SoftLaunchOpsLinks />

      <section className="grid gap-8 xl:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">Player Funnel</h2>
          <FunnelChart data={funnelData} />
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">인기 게임 TOP15</h2>
          <ul className="space-y-3">
            {topGames.map((game) => (
              <li key={game.slug}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{game.title}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {game.plays.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.round((game.plays / maxPlays) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-4 font-semibold">활동 Heatmap (30일)</h2>
        <ActivityHeatmap cells={heatmap} />
      </section>
    </div>
  );
}
