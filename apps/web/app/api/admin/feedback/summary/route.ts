import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getDailyFeedbackSummary,
  getGameFeedbackSummary,
  listFeedbackDates,
} from "@/lib/supabase/game-comments";

/** Ops read-only: daily + per-game feedback aggregation (admin auth). */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? undefined;
  const gameSlug = url.searchParams.get("gameSlug") ?? undefined;
  const listDates = url.searchParams.get("listDates") === "1";

  try {
    if (listDates) {
      const dates = await listFeedbackDates();
      return NextResponse.json({ ok: true, dates });
    }

    if (gameSlug && !date) {
      const games = await getGameFeedbackSummary(gameSlug);
      return NextResponse.json({ ok: true, games });
    }

    const daily = await getDailyFeedbackSummary(date);
    const games = gameSlug
      ? daily.games.filter((g) => g.gameSlug === gameSlug.trim().toLowerCase())
      : daily.games;

    return NextResponse.json({
      ok: true,
      summary: { ...daily, games },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load feedback summary";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
