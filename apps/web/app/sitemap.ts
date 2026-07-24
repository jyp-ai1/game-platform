import type { MetadataRoute } from "next";

import { getCategories } from "@/lib/supabase/categories";
import { getGames } from "@/lib/supabase/games";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function safeLastModified(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl.replace(/\/$/, "");
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/games`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.2 },
  ];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return staticRoutes;
  }

  try {
    const [games, categories] = await Promise.all([getGames(), getCategories()]);

    const gameRoutes: MetadataRoute.Sitemap = games
      .filter((game) => game.status === "ACTIVE" || game.status === "COMING_SOON")
      .map((game) => ({
        url: `${base}/games/${encodeURIComponent(game.slug)}`,
        lastModified: safeLastModified(game.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${base}/categories/${encodeURIComponent(category.slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...gameRoutes, ...categoryRoutes];
  } catch (error) {
    console.error("sitemap generation failed:", error);
    return staticRoutes;
  }
}
