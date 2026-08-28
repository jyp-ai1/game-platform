import { NextResponse } from "next/server";

import type { CreatorGameRecord } from "@/lib/creator/creator-game-registry";
import {
  createServerCreatorGame,
  listServerCreatorGames,
  syncServerRegistry,
} from "@/lib/creator/creator-game-server";

export async function GET() {
  return NextResponse.json({ games: listServerCreatorGames() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    thumbnailUrl?: string | null;
    gameType?: "multiplayer" | "singleplayer";
    creatorId?: string;
    creatorName?: string;
  };

  const game = createServerCreatorGame({
    title: body.title ?? "Untitled",
    description: body.description ?? "",
    thumbnailUrl: body.thumbnailUrl ?? null,
    gameType: body.gameType ?? "singleplayer",
    creatorId: body.creatorId ?? "anonymous",
    creatorName: body.creatorName ?? "Creator",
  });

  return NextResponse.json({ game });
}

/** Client localStorage sync — merge by id. */
export async function PUT(request: Request) {
  const body = (await request.json()) as { games?: CreatorGameRecord[] };
  const incoming = body.games ?? [];
  const existing = listServerCreatorGames();
  const byId = new Map(existing.map((g) => [g.id, g]));
  for (const g of incoming) {
    const prev = byId.get(g.id);
    if (!prev || g.updatedAt >= prev.updatedAt) byId.set(g.id, g);
  }
  const merged = syncServerRegistry([...byId.values()]);
  return NextResponse.json({ games: merged });
}
