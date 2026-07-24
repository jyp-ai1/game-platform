"use client";

import type { Game } from "@game-platform/shared";
import { Button, cn } from "@game-platform/ui";
import { useMemo, useState, useSyncExternalStore } from "react";

import { EmptyState } from "@/components/empty-state";
import { GameGrid } from "@/components/game-grid";
import {
  discoverGames,
  GAME_CATEGORY_FILTERS,
  GAME_SORT_OPTIONS,
  type GameCategoryFilter,
  type GameSortOption,
} from "@/lib/games-discovery";
import { selectHotSlugs } from "@/lib/game-sections";
import {
  getFavoritesSnapshot,
  getRecentlyPlayedSnapshot,
  getServerFavoritesSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeFavorites,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

export function GamesDiscoveryBrowser({
  games,
  hotSlugs,
}: {
  games: Game[];
  hotSlugs?: Set<string>;
}) {
  const [category, setCategory] = useState<GameCategoryFilter>("all");
  const [sort, setSort] = useState<GameSortOption>("popular");
  const [query, setQuery] = useState("");

  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );
  const recentlyPlayed = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );

  const visible = useMemo(
    () => discoverGames(games, category, sort, favorites, recentlyPlayed, query),
    [games, category, sort, favorites, recentlyPlayed, query]
  );

  const resolvedHotSlugs = hotSlugs ?? selectHotSlugs(games);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="games-search" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Search
        </label>
        <input
          id="games-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="게임명 · 태그 검색..."
          className="w-full max-w-md rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Category
        </p>
        <div className="flex flex-wrap gap-2">
          {GAME_CATEGORY_FILTERS.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={category === item.value ? "default" : "outline"}
              onClick={() => setCategory(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {visible.length}개 게임
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Sort</span>
          {GAME_SORT_OPTIONS.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={sort === item.value ? "secondary" : "ghost"}
              className={cn(sort === item.value && "ring-1 ring-border")}
              onClick={() => setSort(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState message="조건에 맞는 게임이 없습니다." />
      ) : (
        <GameGrid games={visible} hotSlugs={resolvedHotSlugs} />
      )}
    </div>
  );
}
