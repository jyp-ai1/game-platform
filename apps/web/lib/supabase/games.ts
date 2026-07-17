import type { Difficulty, Game, GameStatus } from "@game-platform/shared";
import { cache } from "react";

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

const GAME_COLUMNS =
  "id, slug, title, description, thumbnail_url, difficulty, status, sort_order, created_at, updated_at";

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

// Cached per-request so generateMetadata and the page component (which both
// look up the same slug) only hit Supabase once.
export const getGameBySlug = cache(async (slug: string): Promise<Game | null> => {
  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch game "${slug}": ${error.message}`);
  }

  return data ? mapGameRow(data) : null;
});

export async function getGames({
  includeComingSoon = true,
}: { includeComingSoon?: boolean } = {}): Promise<Game[]> {
  const visibleStatuses: GameStatus[] = includeComingSoon
    ? ["ACTIVE", "COMING_SOON"]
    : ["ACTIVE"];

  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .in("status", visibleStatuses)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch games: ${error.message}`);
  }

  return (data ?? []).map(mapGameRow);
}
