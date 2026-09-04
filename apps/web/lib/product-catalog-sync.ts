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
  soloHref?: string;
  multiplayerHref?: string;
};

const MODE_BY_SLUG: Record<ProductFlagshipSlug, ProductGameModes> = {
  snake: {
    solo: true,
    multiplayer: true,
    soloHref: "/flagship/snake-io/play?room=PRACTICE&fallback=1",
    multiplayerHref: "/flagship/snake-io/play?room=WORLD",
  },
  agar: {
    solo: true,
    multiplayer: true,
    soloHref: "/games/agar/play?room=PRACTICE",
    multiplayerHref: "/games/agar/play?room=WORLD",
  },
  bomber: {
    solo: true,
    multiplayer: true,
    soloHref: "/games/bomber/play?room=BOMBER-SOLO",
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
  if (m.solo && m.multiplayer) return "SOLO · MULTIPLAYER";
  if (m.multiplayer) return "MULTIPLAYER";
  if (m.solo) return "SOLO";
  return null;
}

/** Strip deprecated games from any catalog list. */
export function filterProductCatalogGames(games: Game[]): Game[] {
  return games.filter((g) => !isDeprecatedProductSlug(g.slug));
}

/** Ensure flagship MVP rows exist in catalog merge. */
export function productMvpSlugs(): readonly string[] {
  return PRODUCT_FLAGSHIP_SLUGS;
}
