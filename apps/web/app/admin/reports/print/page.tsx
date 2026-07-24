import Link from "next/link";

import { PrintReportButton } from "@/components/admin/print-report-button";
import { fetchMonthlyOpsReport } from "@/lib/supabase/ops-server";

export const metadata = { title: "Monthly Report Print" };

export default async function AdminReportsPrintPage() {
  const monthly = await fetchMonthlyOpsReport();

  if (!monthly) {
    return (
      <div className="p-8">
        <p>Report unavailable — check 0018 migration.</p>
        <Link href="/admin/reports" className="text-primary underline">
          ← Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8 print:p-4">
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Link href="/admin/reports" className="text-sm text-primary hover:underline">
          ← Reports
        </Link>
        <PrintReportButton />
      </div>

      <header className="border-b pb-6">
        <p className="text-sm text-muted-foreground">Re:Play Operations Report</p>
        <h1 className="mt-1 text-3xl font-bold">월간 운영 보고서</h1>
        <p className="mt-2 text-muted-foreground">{monthly.month}</p>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
        <div>
          <p className="text-sm text-muted-foreground">DAU (avg)</p>
          <p className="text-2xl font-bold tabular-nums">{monthly.dau_avg}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Plays</p>
          <p className="text-2xl font-bold tabular-nums">{monthly.total_plays}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Scores</p>
          <p className="text-2xl font-bold tabular-nums">{monthly.total_scores}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">New Players</p>
          <p className="text-2xl font-bold tabular-nums">{monthly.new_players}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Errors</p>
          <p className="text-2xl font-bold tabular-nums">{monthly.errors}</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Top Games</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Game</th>
              <th className="py-2">Plays</th>
            </tr>
          </thead>
          <tbody>
            {monthly.top_games.map((g, i) => (
              <tr key={g.game_slug} className="border-b border-border/50">
                <td className="py-2 pr-4 tabular-nums">{i + 1}</td>
                <td className="py-2 pr-4">{g.game_slug}</td>
                <td className="py-2 tabular-nums">{g.plays.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-12 text-xs text-muted-foreground print:mt-8">
        Generated {new Date().toLocaleString("ko-KR")} · Re:Play Admin
      </footer>
    </div>
  );
}
