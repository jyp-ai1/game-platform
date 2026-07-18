import type { Category } from "@game-platform/shared";

import { supabase } from "./client";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

const CATEGORY_COLUMNS = "id, name, slug, sort_order";

function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
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
