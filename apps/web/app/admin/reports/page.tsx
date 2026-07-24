import Link from "next/link";

import { fetchDailyStatsForExport, fetchMonthlyOpsReport } from "@/lib/supabase/ops-server";

export const metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  const [monthly, daily] = await Promise.all([
    fetchMonthlyOpsReport(),
    fetchDailyStatsForExport(30),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Report Center</h1>
        <p className="text-sm text-muted-foreground">
          CSV · Excel · PDF(인쇄) · 월간 운영 보고서
        </p>
      </div>

      {!monthly ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          `0018_sprint12.sql` 마이그레이션 적용 후 Report Center가 활성화됩니다.
        </p>
      ) : (
        <>
          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-4 font-semibold">이번 달 요약</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">DAU (avg)</p>
                <p className="text-xl font-bold tabular-nums">{monthly.dau_avg}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Plays</p>
                <p className="text-xl font-bold tabular-nums">{monthly.total_plays}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New Players</p>
                <p className="text-xl font-bold tabular-nums">{monthly.new_players}</p>
              </div>
            </div>
            <h3 className="mb-2 mt-6 text-sm font-medium">Top Games</h3>
            <ul className="space-y-1 text-sm">
              {monthly.top_games.map((g) => (
                <li key={g.game_slug} className="flex justify-between">
                  <span>{g.game_slug}</span>
                  <span className="tabular-nums text-muted-foreground">{g.plays}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-semibold">Daily Stats (30일)</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <a
                href="/admin/reports/export?type=daily&format=csv"
                className="rounded-xl border bg-card p-4 hover:bg-muted/50"
              >
                <p className="font-medium">CSV</p>
                <p className="mt-1 text-sm text-muted-foreground">DAU · Plays · Scores</p>
              </a>
              <a
                href="/admin/reports/export?type=daily&format=excel"
                className="rounded-xl border bg-card p-4 hover:bg-muted/50"
              >
                <p className="font-medium">Excel (.xls)</p>
                <p className="mt-1 text-sm text-muted-foreground">Excel 2003 XML 형식</p>
              </a>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-semibold">Monthly Report</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a
                href="/admin/reports/export?type=monthly&format=csv"
                className="rounded-xl border bg-card p-4 hover:bg-muted/50"
              >
                <p className="font-medium">CSV</p>
                <p className="mt-1 text-sm text-muted-foreground">KPI + Top Games</p>
              </a>
              <a
                href="/admin/reports/export?type=monthly&format=excel"
                className="rounded-xl border bg-card p-4 hover:bg-muted/50"
              >
                <p className="font-medium">Excel (.xls)</p>
                <p className="mt-1 text-sm text-muted-foreground">Summary + TopGames 시트</p>
              </a>
              <Link
                href="/admin/reports/print"
                className="rounded-xl border bg-card p-4 hover:bg-muted/50"
              >
                <p className="font-medium">Print / PDF</p>
                <p className="mt-1 text-sm text-muted-foreground">인쇄 미리보기 → PDF 저장</p>
              </Link>
            </div>
          </section>

          {daily.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Daily rows: {daily.length} · Monthly games: {monthly.top_games.length}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
