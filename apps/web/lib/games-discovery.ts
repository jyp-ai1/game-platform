import type { Game } from "@game-platform/shared";

import { isRecentlyCreated } from "@/lib/game-sections";
import { searchGames } from "@/lib/search";

export type GameCategoryFilter =
  | "all"
  | "new"
  | "puzzle"
  | "arcade"
  | "board"
  | "sports"
  | "casual";

export type GameViewFilter = "all" | "favorites" | "recent";

export type GameSortOption = "popular" | "newest" | "favorites" | "played";

export const GAME_CATEGORY_FILTERS: Array<{
  value: GameCategoryFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "new", label: "NEW" },
  { value: "puzzle", label: "Puzzle" },
  { value: "arcade", label: "Arcade" },
  { value: "board", label: "Board" },
  { value: "sports", label: "Sports" },
  { value: "casual", label: "Casual" },
];

export const GAME_SORT_OPTIONS: Array<{ value: GameSortOption; label: string }> = [
  { value: "popular", label: "인기순" },
  { value: "newest", label: "최신순" },
  { value: "favorites", label: "즐겨찾기순" },
  { value: "played", label: "플레이순" },
];

export const GAME_VIEW_FILTERS: Array<{ value: GameViewFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "favorites", label: "즐겨찾기" },
  { value: "recent", label: "최근 플레이" },
];

export function filterGamesByView(
  games: Game[],
  view: GameViewFilter,
  favorites: string[],
  recentlyPlayed: string[]
): Game[] {
  if (view === "favorites") {
    return games.filter((g) => favorites.includes(g.slug));
  }
  if (view === "recent") {
    const order = new Map(recentlyPlayed.map((slug, i) => [slug, i]));
    return games
      .filter((g) => order.has(g.slug))
      .sort((a, b) => order.get(a.slug)! - order.get(b.slug)!);
  }
  return games;
}

export function filterGamesByCategory(
  games: Game[],
  filter: GameCategoryFilter
): Game[] {
  if (filter === "all") return games;
  if (filter === "new") {
    return games.filter(
      (game) =>
        game.status === "ACTIVE" && isRecentlyCreated(game.createdAt)
    );
  }
  return games.filter((game) => game.category?.slug === filter);
}

function indexInList(slug: string, list: string[]): number {
  const i = list.indexOf(slug);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

export function sortGames(
  games: Game[],
  sort: GameSortOption,
  favorites: string[],
  recentlyPlayed: string[]
): Game[] {
  const items = [...games];

  switch (sort) {
    case "newest":
      return items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "favorites":
      return items.sort((a, b) => {
        const aFav = favorites.includes(a.slug) ? 0 : 1;
        const bFav = favorites.includes(b.slug) ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;
        return b.playCount - a.playCount;
      });
    case "played":
      return items.sort((a, b) => {
        const aIdx = indexInList(a.slug, recentlyPlayed);
        const bIdx = indexInList(b.slug, recentlyPlayed);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return b.playCount - a.playCount;
      });
    case "popular":
    default:
      return items.sort((a, b) => {
        if (b.playCount !== a.playCount) return b.playCount - a.playCount;
        return a.sortOrder - b.sortOrder;
      });
  }
}

export function discoverGames(
  games: Game[],
  filter: GameCategoryFilter,
  sort: GameSortOption,
  favorites: string[],
  recentlyPlayed: string[],
  query = "",
  view: GameViewFilter = "all"
): Game[] {
  const byView = filterGamesByView(games, view, favorites, recentlyPlayed);
  const filtered = filterGamesByCategory(byView, filter);
  const searched = searchGames(filtered, query);
  return sortGames(searched, sort, favorites, recentlyPlayed);
}
