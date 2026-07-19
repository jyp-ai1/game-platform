import type { Game } from "@game-platform/shared";

export function searchGames(games: Game[], query: string): Game[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return games;
  }

  return games.filter(
    (game) =>
      game.title.toLowerCase().includes(q) ||
      game.description.toLowerCase().includes(q) ||
      game.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      (game.category?.name.toLowerCase().includes(q) ?? false)
  );
}
