/**
 * GAME-PLATFORM-SYNC-001 — Product catalog truth source.
 * Repository playable games vs Product visibility (CEO: Territory War deprecated).
 */
import type { Game } from "@game-platform/shared";

/** Deprecated — no catalog, games list, QA, or recommendations. Code kept in repo only. */
export const DEPRECATED_PRODUCT_SLUGS = new Set(["territory-war"]);

/** Active flagship games synced to Product (Territory War excluded). */
export const PRODUCT_FLAGSHIP_SLUGS = ["snake", "agar", "bomber", "re-front"] as const;

export type ProductFlagshipSlug = (typeof PRODUCT_FLAGSHIP_SLUGS)[number];

export type ProductPlayMode = "solo" | "multiplayer";

export type ProductGameModes = {
  solo: boolean;
  multiplayer: boolean;
  multiplayerHref?: string;
};

export { FLAGSHIP_CATALOG_HREF } from "@game-platform/game-sdk";

const MODE_BY_SLUG: Record<ProductFlagshipSlug, ProductGameModes> = {
  snake: {
    solo: false,
    multiplayer: true,
    multiplayerHref: "/games/snake/play?room=WORLD",
  },
  agar: {
    solo: false,
    multiplayer: true,
    multiplayerHref: "/games/agar/play?room=GL-AGAR",
  },
  bomber: {
    solo: false,
    multiplayer: true,
    multiplayerHref: "/games/bomber/play?room=BOMBER-A",
  },
  "re-front": {
    solo: false,
    multiplayer: true,
    multiplayerHref: "/games/re-front/play?room=RF-LOBBY",
  },
};

export function isDeprecatedProductSlug(slug: string): boolean {
  return DEPRECATED_PRODUCT_SLUGS.has(slug);
}

export function isProductFlagshipSlug(slug: string): slug is ProductFlagshipSlug {
  return (PRODUCT_FLAGSHIP_SLUGS as readonly string[]).includes(slug);
}

export function getProductGameModes(slug: string): ProductGameModes | null {
  if (!isProductFlagshipSlug(slug)) return null;
  return MODE_BY_SLUG[slug];
}

export function productModeLabel(slug: string): string | null {
  const m = getProductGameModes(slug);
  if (!m) return null;
  if (m.multiplayer) return "MULTIPLAYER";
  if (m.solo) return "SOLO";
  return null;
}

/** Short product facts on official Detail / Catalog — not Discover copy. */
export const PRODUCT_FLAGSHIP_FEATURES: Record<ProductFlagshipSlug, readonly string[]> = {
  snake: ["Eat and boost in a living WORLD", "Death → Result → Rematch same world", "EXIT returns to Snake Detail"],
  agar: ["Split, eat, and grow with others", "Host / Guest share one world", "Death → Result → Rematch / Another / Exit"],
  bomber: ["Plant bombs on a shared shard", "Character → Color → ENTER (no Map Select)", "Fail = Retry / Back, never Solo"],
  "re-front": ["Host / Guest territory combat", "Hold 70% to win", "Result → Rematch / Another / Exit"],
};

export function productFlagshipFeatures(slug: string): readonly string[] {
  if (!isProductFlagshipSlug(slug)) return [];
  return PRODUCT_FLAGSHIP_FEATURES[slug];
}

/** Strip deprecated games from any catalog list. */
export function filterProductCatalogGames(games: Game[]): Game[] {
  return games.filter((g) => !isDeprecatedProductSlug(g.slug));
}

/** Official Product Catalog only — Snake · Agar · Bomber · Re:Front. */
export function selectOfficialProductGames(games: Game[]): Game[] {
  const order = new Map<string, number>(PRODUCT_FLAGSHIP_SLUGS.map((slug, i) => [slug, i]));
  return games
    .filter((g) => isProductFlagshipSlug(g.slug) && g.status === "ACTIVE")
    .sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99));
}

/** Ensure flagship MVP rows exist in catalog merge. */
export function productMvpSlugs(): readonly string[] {
  return PRODUCT_FLAGSHIP_SLUGS;
}
