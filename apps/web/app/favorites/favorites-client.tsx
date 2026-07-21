"use client";

import type { Game } from "@game-platform/shared";
import { Heart } from "lucide-react";
import { useSyncExternalStore } from "react";

import { EmptyState } from "@/components/empty-state";
import { GameGrid } from "@/components/game-grid";
import {
  getFavoritesSnapshot,
  getRecentlyPlayedSnapshot,
  getServerFavoritesSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeFavorites,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

export function FavoritesClient({ games }: { games: Game[] }) {
  const slugs = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );
  const recentlyPlayed = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );

  // Recently-played-first: favorites not in the recently-played list sort
  // after everything that is (in recency order), rather than being dropped.
  const sortedSlugs = [...slugs].sort((a, b) => {
    const aIndex = recentlyPlayed.indexOf(a);
    const bIndex = recentlyPlayed.indexOf(b);
    if (aIndex === -1 && bIndex === -1) {
      return 0;
    }
    if (aIndex === -1) {
      return 1;
    }
    if (bIndex === -1) {
      return -1;
    }
    return aIndex - bIndex;
  });

  const bySlug = new Map(games.map((game) => [game.slug, game]));
  const favoriteGames = sortedSlugs
    .map((slug) => bySlug.get(slug))
    .filter((game): game is Game => game !== undefined);

  if (favoriteGames.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        message="아직 즐겨찾기한 게임이 없습니다. 게임 카드의 하트를 눌러 추가해보세요."
      />
    );
  }

  return <GameGrid games={favoriteGames} />;
}
