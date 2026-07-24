import Link from "next/link";

import { fetchDailyStatsForExport, fetchMonthlyOpsReport } from "@/lib/supabase/ops-server";

export const metadata = { title: "Reports" };

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val == null ? "" : String(val);
          return str.includes(",") ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

export default async function AdminReportsPage() {
  const [monthly, daily] = await Promise.all([
    fetchMonthlyOpsReport(),
    fetchDailyStatsForExport(30),
  ]);

  const dailyCsv = toCsv(daily as Record<string, unknown>[]);
  const monthlyCsv = monthly
    ? toCsv([
        {
          month: monthly.month,
          dau_avg: monthly.dau_avg,
          total_plays: monthly.total_plays,
          total_scores: monthly.total_scores,
          new_players: monthly.new_players,
          errors: monthly.errors,
        },
        ...monthly.top_games.map((g) => ({
          month: monthly.month,
          game_slug: g.game_slug,
          plays: g.plays,
          row_type: "top_game",
        })),
      ])
    : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Report Center</h1>
        <p className="text-sm text-muted-foreground">
          CSV 내보내기 · 월간 운영 보고서
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

          <section className="grid gap-4 sm:grid-cols-2">
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(dailyCsv)}`}
              download="replay-daily-stats.csv"
              className="rounded-xl border bg-card p-4 hover:bg-muted/50"
            >
              <p className="font-medium">Daily Stats CSV</p>
              <p className="mt-1 text-sm text-muted-foreground">최근 30일 DAU · Plays · Scores</p>
            </a>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(monthlyCsv)}`}
              download="replay-monthly-report.csv"
              className="rounded-xl border bg-card p-4 hover:bg-muted/50"
            >
              <p className="font-medium">Monthly Report CSV</p>
              <p className="mt-1 text-sm text-muted-foreground">이번 달 운영 KPI</p>
            </a>
          </section>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Excel/PDF 자동 생성은 Sprint 12 후반(T5)에서 확장 예정.
      </p>
    </div>
  );
}
