import { Suspense } from "react";

import { ActivityHeatmap } from "@/components/admin/activity-heatmap";
import { CohortGrid } from "@/components/admin/cohort-grid";
import {
  DashboardPeriodTabs,
  type DashboardPeriod,
} from "@/components/admin/dashboard-period-tabs";
import { FunnelChart, type FunnelData } from "@/components/admin/funnel-chart";
import {
  fetchActivityHeatmap,
  fetchCohortRetention,
  fetchDashboardKpisExtended,
  fetchDailyStats,
  fetchPlayerFunnel,
  fetchTodayStats,
  fetchTopGamesAnalytics,
  type DashboardPeriod as ServerPeriod,
} from "@/lib/supabase/admin-server";

export const metadata = { title: "Dashboard" };

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function maskDeviceId(deviceId: string): string {
  if (deviceId.length <= 8) return "****";
  return `${deviceId.slice(0, 4)}…${deviceId.slice(-4)}`;
}

function parsePeriod(raw?: string): ServerPeriod {
  if (raw === "week" || raw === "month" || raw === "all") return raw;
  return "today";
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);

  const [kpis, funnel, cohort, heatmap, topGames, daily, live] = await Promise.all([
    fetchDashboardKpisExtended(period),
    fetchPlayerFunnel(period),
    fetchCohortRetention(14),
    fetchActivityHeatmap(30),
    fetchTopGamesAnalytics(period, 10),
    fetchDailyStats(14),
    fetchTodayStats(),
  ]);

  const maxPlays = topGames[0]?.plays ?? 1;
  const funnelData: FunnelData = {
    session: funnel?.session ?? 0,
    game_start: funnel?.game_start ?? 0,
    game_end: funnel?.game_end ?? 0,
    score_submit: funnel?.score_submit ?? 0,
    ranking_submit: funnel?.ranking_submit ?? 0,
    favorite: funnel?.favorite ?? 0,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            운영 KPI · Funnel · Cohort · Heatmap
          </p>
        </div>
        <Suspense fallback={<div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />}>
          <DashboardPeriodTabs current={period as DashboardPeriod} />
        </Suspense>
      </div>

      {!kpis ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          SUPABASE_SECRET_KEY 또는 0010/0012/0013/0016 마이그레이션을 확인하세요.
        </p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <StatCard label="DAU" value={kpis.dau} />
            <StatCard label="WAU" value={kpis.wau} />
            <StatCard label="MAU" value={kpis.mau} />
            <StatCard label="신규 유저" value={kpis.new_users} />
            <StatCard label="복귀 유저" value={kpis.returning_users} />
            <StatCard label="플레이" value={kpis.session_starts} />
            <StatCard label="랭킹 등록" value={kpis.ranking_submits} />
            <StatCard label="오류" value={kpis.errors} />
          </section>

          {"stickiness" in kpis ? (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <StatCard label="Stickiness (DAU/MAU %)" value={`${kpis.stickiness}%`} />
              <StatCard label="Avg Session Events" value={kpis.avg_session_events} />
              <StatCard label="Avg Play Time (sec)" value={kpis.avg_play_time_sec} />
              <StatCard label="Avg Score" value={kpis.avg_score} />
              <StatCard label="Game Completions" value={kpis.game_completions} />
              <StatCard label="Save → Resume %" value={`${kpis.resume_rate}%`} />
              <StatCard label="Saves / Resumes" value={`${kpis.save_count} / ${kpis.resume_count}`} />
            </section>
          ) : null}
        </>
      )}

      <section className="grid gap-8 xl:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">Player Funnel</h2>
          <FunnelChart data={funnelData} />
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">인기 게임 TOP10</h2>
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

      <section className="grid gap-8 xl:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">Cohort Retention (D1/D7/D30)</h2>
          <CohortGrid rows={cohort} />
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">활동 Heatmap (30일)</h2>
          <ActivityHeatmap cells={heatmap} />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">실시간 플레이</h2>
          {live?.recent_plays?.length ? (
            <ul className="divide-y text-sm">
              {live.recent_plays.map((play, i) => (
                <li key={`${play.game_slug}-${i}`} className="flex justify-between py-2">
                  <span>
                    <span className="text-muted-foreground">
                      {maskDeviceId(play.device_id)}
                    </span>
                    {" · "}
                    {play.game_slug}
                  </span>
                  <span className="text-muted-foreground">{play.seconds_ago}s ago</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">최근 session_start 없음</p>
          )}
        </div>

        {daily.length > 0 ? (
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-4 font-semibold">Growth (14일)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">DAU</th>
                    <th className="py-2 pr-4">Plays</th>
                    <th className="py-2">Scores</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((row) => (
                    <tr key={row.day} className="border-b border-border/50">
                      <td className="py-2 pr-4">{row.day}</td>
                      <td className="py-2 pr-4 tabular-nums">{row.dau}</td>
                      <td className="py-2 pr-4 tabular-nums">{row.session_starts}</td>
                      <td className="py-2 tabular-nums">{row.score_submits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
