import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { buildFeedbackDashboard } from "@/lib/feedback-intelligence";
import { listAllP0Feedback } from "@/lib/supabase/game-comments";
import { listWorkOrders } from "@/lib/feedback-work-orders";

/** Full ops dashboard: totals, game table, daily 7d, repeat patterns, work orders */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const [rows, workOrders] = await Promise.all([listAllP0Feedback(), listWorkOrders(50)]);
    const dashboard = buildFeedbackDashboard(rows);

    return NextResponse.json({
      ok: true,
      dashboard,
      workOrders,
      p0Games: dashboard.games.map((g) => g.gameSlug),
      territoryWarExcluded: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load dashboard";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
