import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  listReviewCreatorGames,
  listServerCreatorGames,
  transitionCreatorGame,
} from "@/lib/creator/creator-game-server";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    games: listServerCreatorGames(),
    reviewQueue: listReviewCreatorGames(),
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string; action?: string };
  const { id, action } = body;
  if (!id || !action) {
    return NextResponse.json({ error: "id and action required" }, { status: 400 });
  }

  if (
    action !== "publish" &&
    action !== "reject" &&
    action !== "unpublish"
  ) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const game = transitionCreatorGame(id, action);
  if (!game) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ game });
}
