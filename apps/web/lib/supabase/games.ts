import type { Difficulty, Game, GameStatus } from "@game-platform/shared";

import { supabase } from "./client";

interface GameRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  difficulty: Difficulty;
  status: GameStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapGameRow(row: GameRow): Game {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    difficulty: row.difficulty,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getGames({
  includeComingSoon = true,
}: { includeComingSoon?: boolean } = {}): Promise<Game[]> {
  const visibleStatuses: GameStatus[] = includeComingSoon
    ? ["ACTIVE", "COMING_SOON"]
    : ["ACTIVE"];

  const { data, error } = await supabase
    .from("games")
    .select(
      "id, slug, title, description, thumbnail_url, difficulty, status, sort_order, created_at, updated_at"
    )
    .in("status", visibleStatuses)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch games: ${error.message}`);
  }

  return (data ?? []).map(mapGameRow);
}
