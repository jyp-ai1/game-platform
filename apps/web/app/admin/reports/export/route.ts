import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { buildExcelXml, toCsv } from "@/lib/ops/report-export";
import {
  fetchDailyStatsForExport,
  fetchMonthlyOpsReport,
} from "@/lib/supabase/ops-server";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "daily";
  const format = searchParams.get("format") ?? "csv";

  if (type === "monthly") {
    const monthly = await fetchMonthlyOpsReport();
    if (!monthly) {
      return NextResponse.json({ error: "Report unavailable" }, { status: 503 });
    }

    const summaryRows = [
      {
        month: monthly.month,
        dau_avg: monthly.dau_avg,
        total_plays: monthly.total_plays,
        total_scores: monthly.total_scores,
        new_players: monthly.new_players,
        errors: monthly.errors,
      },
    ];
    const gameRows = monthly.top_games.map((g) => ({
      month: monthly.month,
      game_slug: g.game_slug,
      plays: g.plays,
    }));

    if (format === "xlsx" || format === "excel") {
      const xml = buildExcelXml([
        { name: "Summary", rows: summaryRows },
        { name: "TopGames", rows: gameRows },
      ]);
      return new NextResponse(xml, {
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": 'attachment; filename="replay-monthly-report.xls"',
        },
      });
    }

    const csv = toCsv([...summaryRows, ...gameRows.map((r) => ({ ...r, row_type: "top_game" }))]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="replay-monthly-report.csv"',
      },
    });
  }

  const daily = await fetchDailyStatsForExport(30);
  const rows = daily as Record<string, unknown>[];

  if (format === "xlsx" || format === "excel") {
    const xml = buildExcelXml([{ name: "DailyStats", rows }]);
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": 'attachment; filename="replay-daily-stats.xls"',
      },
    });
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="replay-daily-stats.csv"',
    },
  });
}
