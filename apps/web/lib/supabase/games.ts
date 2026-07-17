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
  category_id: string | null;
  is_featured: boolean;
  categories: { name: string; slug: string } | null;
  created_at: string;
  updated_at: string;
}

const GAME_COLUMNS =
  "id, slug, title, description, thumbnail_url, difficulty, status, sort_order, category_id, is_featured, created_at, updated_at, categories(name, slug)";

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
    categoryId: row.category_id,
    category: row.categories,
    isFeatured: row.is_featured,
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

  return data ? mapGameRow(data as unknown as GameRow) : null;
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

  // Without a generated Database type, supabase-js infers embedded resources
  // (categories) as arrays even though category_id makes this a to-one join
  // that returns a single object at runtime.
  return (data ?? []).map((row) => mapGameRow(row as unknown as GameRow));
}
