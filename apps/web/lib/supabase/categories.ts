import type { Category } from "@game-platform/shared";

import { supabase } from "./client";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  banner_url: string | null;
  description: string | null;
  featured_game_id: string | null;
}

const CATEGORY_COLUMNS =
  "id, name, slug, sort_order, banner_url, description, featured_game_id";

function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
    bannerUrl: row.banner_url,
    description: row.description,
    featuredGameId: row.featured_game_id,
  };
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data ?? []).map(mapCategoryRow);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch category "${slug}": ${error.message}`);
  }

  return data ? mapCategoryRow(data) : null;
}
