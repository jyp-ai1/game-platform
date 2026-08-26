/**
 * Sprint17 STEP6 — minimal catalog view-model (no new DB schema).
 * Maps existing Game rows into a catalog entry Snake/Agar can share.
 */
import type { Game } from "@game-platform/shared";
import { getGameTier, REALTIME_GAMES } from "@game-platform/multiplayer-sdk";

export type CatalogPlayMode = "single" | "party" | "realtime";

export interface GameCatalogEntry {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: Game["status"];
  tags: string[];
  playMode: CatalogPlayMode;
  /** Primary CTA path for home / multiplayer cards */
  playHref: string;
  isFlagship: boolean;
}

/** Home / catalog cards land here — Detail only, never Character lobby. */
export function detailHrefForCatalogSlug(slug: string): string {
  return `/games/${slug}`;
}

export function playHrefForCatalogSlug(slug: string): string {
  // Detail CTA → Character/Color entry (flagship Snake or /games/{slug}/play).
  if (slug === "snake") return "/flagship/snake-io/play?room=WORLD";
  if (slug === "agar") return "/games/agar/play?room=WORLD";
  if (slug === "bomber") return "/games/bomber/play?room=ROOM";
  return `/games/${slug}/play`;
}

/** Represent an existing Game row in the catalog model. */
export function toGameCatalogEntry(game: Game): GameCatalogEntry {
  const playMode = getGameTier(game.slug) as CatalogPlayMode;
  return {
    id: game.id,
    slug: game.slug,
    title: game.title,
    description: game.description,
    status: game.status,
    tags: game.tags,
    playMode: REALTIME_GAMES.has(game.slug) ? "realtime" : playMode,
    playHref: playHrefForCatalogSlug(game.slug),
    isFlagship: game.slug === "snake" || game.isFeatured,
  };
}

/** Snake is representable when ACTIVE (or featured) with realtime play href. */
export function snakeCatalogReady(games: Game[]): {
  ok: boolean;
  entry: GameCatalogEntry | null;
} {
  const snake = games.find((g) => g.slug === "snake") ?? null;
  if (!snake) return { ok: false, entry: null };
  const entry = toGameCatalogEntry(snake);
  const ok =
    entry.slug === "snake" &&
    !!entry.title &&
    entry.playHref.includes("snake") &&
    (entry.status === "ACTIVE" || entry.isFlagship);
  return { ok, entry };
}
