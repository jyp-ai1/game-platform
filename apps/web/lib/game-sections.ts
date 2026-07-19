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

// Placeholder until Sprint 3 adds real play-count/analytics-based ranking:
// reuses the existing sort_order as a stand-in for "popular".
export function selectPopular(games: Game[], limit = 4): Game[] {
  return games.slice(0, limit);
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
