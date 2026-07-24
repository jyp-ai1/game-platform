import Link from "next/link";

import { GameRankingsPanel } from "@/components/admin/game-rankings-panel";
import {
  SoftLaunchKpiCards,
  SoftLaunchOpsLinks,
} from "@/components/admin/soft-launch-panel";
import { computeSoftLaunchRates, computeWeeklyCompare } from "@/lib/admin/soft-launch-metrics";
import {
  fetchAllGamesByPlays,
  fetchDailyStats,
  fetchDashboardKpisExtended,
  fetchEventCount,
  fetchPlayerFunnel,
} from "@/lib/supabase/admin-server";

export const metadata = { title: "Soft Launch" };

export default async function AdminSoftLaunchPage() {
  const period = "week" as const;

  const [funnel, kpis, missionCount, allGames, daily] = await Promise.all([
    fetchPlayerFunnel(period),
    fetchDashboardKpisExtended(period),
    fetchEventCount("mission_complete", period),
    fetchAllGamesByPlays(period, 50),
    fetchDailyStats(14),
  ]);

  const rates = computeSoftLaunchRates(funnel, kpis?.dau ?? 0, missionCount);
  const top5 = allGames.slice(0, 5);
  const bottom5 = [...allGames].sort((a, b) => a.plays - b.plays).slice(0, 5);
  const weekly = computeWeeklyCompare(daily);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Soft Launch — Sprint 12.1</h1>
        <p className="text-sm text-muted-foreground">
          운영 검증 · 데이터 수집 · Major Bug 0
        </p>
      </div>

      <SoftLaunchKpiCards dau={kpis?.dau ?? 0} rates={rates} />

      <GameRankingsPanel topGames={top5} bottomGames={bottom5} />

      {daily.length >= 7 ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">주간 비교</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Period</th>
                  <th className="py-2 pr-4">Avg DAU</th>
                  <th className="py-2 pr-4">Plays</th>
                  <th className="py-2">Scores</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">{weekly.thisWeek.label}</td>
                  <td className="py-2 pr-4 tabular-nums">{weekly.thisWeek.dau}</td>
                  <td className="py-2 pr-4 tabular-nums">{weekly.thisWeek.plays}</td>
                  <td className="py-2 tabular-nums">{weekly.thisWeek.scores}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">{weekly.prevWeek.label}</td>
                  <td className="py-2 pr-4 tabular-nums">{weekly.prevWeek.dau}</td>
                  <td className="py-2 pr-4 tabular-nums">{weekly.prevWeek.plays}</td>
                  <td className="py-2 tabular-nums">{weekly.prevWeek.scores}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <SoftLaunchOpsLinks />

      <p className="text-sm text-muted-foreground">
        종료 후{" "}
        <Link
          href="https://github.com/jyp-ai1/game-platform/blob/main/docs/reports/soft-launch-summary.md"
          className="text-primary underline-offset-4 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          soft-launch-summary.md
        </Link>{" "}
        작성 → Data Review → PM GA
      </p>
    </div>
  );
}
