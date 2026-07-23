import type { Game } from "@game-platform/shared";

const NEW_WINDOW_DAYS = 14;

export function isRecentlyCreated(createdAt: string): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export function selectFeatured(games: Game[], limit = 4): Game[] {
  return games.filter((game) => game.isFeatured).slice(0, limit);
}

export function selectNew(games: Game[], limit = 4): Game[] {
  return games.filter((game) => isRecentlyCreated(game.createdAt)).slice(0, limit);
}

// Real popularity ranking based on play_count (incremented once per page
// view of a playable game — see recently-played-recorder.tsx). Ties (e.g.
// all-zero on a fresh deploy) fall back to the incoming sort_order via
// Array.prototype.sort's stability.
export function selectPopular(games: Game[], limit = 4): Game[] {
  return [...games].sort((a, b) => b.playCount - a.playCount).slice(0, limit);
}

// Games that are both genuinely popular (play_count > 0, so a fresh deploy
// with no play data doesn't mark arbitrary games "HOT") and in the current
// top tier by play count.
export function selectHotSlugs(games: Game[], limit = 3): Set<string> {
  return new Set(
    selectPopular(
      games.filter((game) => game.playCount > 0),
      limit
    ).map((game) => game.slug)
  );
}

export function selectComingSoon(games: Game[], limit = 4): Game[] {
  return games.filter((game) => game.status === "COMING_SOON").slice(0, limit);
}

export function selectRelated(games: Game[], current: Game, limit = 4): Game[] {
  return games
    .filter(
      (game) =>
        game.slug !== current.slug &&
        game.categoryId !== null &&
        game.categoryId === current.categoryId
    )
    .slice(0, limit);
}

// Powers the homepage's narrative curation rows ("90s-2000s", "arcade-
// classic", "quick-play", etc.) purely from the existing tags column — no
// dedicated schema needed for curation.
export function selectByTag(games: Game[], tag: string, limit = 8): Game[] {
  return games.filter((game) => game.tags.includes(tag)).slice(0, limit);
}

export function selectByCategorySlug(
  games: Game[],
  categorySlug: string,
  limit = 8
): Game[] {
  return games
    .filter((game) => game.category?.slug === categorySlug)
    .slice(0, limit);
}

export function selectBySlugs(games: Game[], slugs: string[], limit = 8): Game[] {
  const order = new Map(slugs.map((slug, i) => [slug, i]));
  return games
    .filter((game) => order.has(game.slug))
    .sort((a, b) => (order.get(a.slug)! - order.get(b.slug)!))
    .slice(0, limit);
}
