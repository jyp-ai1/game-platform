import { NextResponse } from "next/server";

import { transitionCreatorGame } from "@/lib/creator/creator-game-server";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = (await request.json()) as { action?: string };

  const action = body.action;
  if (
    action !== "preview" &&
    action !== "review" &&
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

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { getServerCreatorGameById } = await import("@/lib/creator/creator-game-server");
  const game = getServerCreatorGameById(id);
  if (!game) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ game });
}
