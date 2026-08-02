import type { Category, Game } from "@game-platform/shared";

/** Static fallbacks when Supabase category row is missing (e.g. board before migration). */
const FALLBACK_CATEGORIES: Record<string, Category> = {
  board: {
    id: "__fallback_board__",
    name: "Board",
    slug: "board",
    sortOrder: 8,
    bannerUrl: null,
    description: "보드게임 감성의 전략·클래식 게임 모음.",
    featuredGameId: null,
  },
};

const BOARD_GAME_SLUGS = new Set([
  "connect4",
  "reversi",
  "gomoku",
  "chess",
  "checkers",
  "mancala",
  "domino",
  "chess960",
  "shuffleboard",
]);

export function getFallbackCategory(slug: string): Category | null {
  return FALLBACK_CATEGORIES[slug] ?? null;
}

export function filterGamesForCategory(category: Category, games: Game[]): Game[] {
  if (category.id === "__fallback_board__") {
    return games.filter(
      (game) =>
        game.category?.slug === "board" ||
        game.tags.includes("board") ||
        BOARD_GAME_SLUGS.has(game.slug)
    );
  }
  return games.filter((game) => game.categoryId === category.id);
}
