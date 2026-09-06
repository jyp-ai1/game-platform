import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isFeedbackType, type FeedbackStatus } from "@/lib/game-feedback-types";
import { listAllP0Feedback } from "@/lib/supabase/game-comments";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const gameSlug = url.searchParams.get("gameSlug")?.trim().toLowerCase();
  const feedbackType = url.searchParams.get("feedbackType");
  const status = url.searchParams.get("status") as FeedbackStatus | null;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);

  try {
    let items = await listAllP0Feedback();
    if (gameSlug) items = items.filter((i) => i.gameSlug === gameSlug);
    if (feedbackType && isFeedbackType(feedbackType)) {
      items = items.filter((i) => i.feedbackType === feedbackType);
    }
    if (status) items = items.filter((i) => i.status === status);
    return NextResponse.json({ ok: true, items: items.slice(0, limit) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list feedback";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
