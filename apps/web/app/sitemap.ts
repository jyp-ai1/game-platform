import type { MetadataRoute } from "next";

import { getCategories } from "@/lib/supabase/categories";
import { getGames } from "@/lib/supabase/games";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [games, categories] = await Promise.all([getGames(), getCategories()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/games`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/contact`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const indexableGames = games.filter(
    (game) => game.status === "ACTIVE" || game.status === "COMING_SOON"
  );

  const gameRoutes: MetadataRoute.Sitemap = indexableGames.map((game) => ({
    url: `${siteUrl}/games/${game.slug}`,
    lastModified: game.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // /favorites is excluded — it's entirely localStorage-driven per visitor,
  // with no server-rendered content to index.
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteUrl}/categories/${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...gameRoutes, ...categoryRoutes];
}
