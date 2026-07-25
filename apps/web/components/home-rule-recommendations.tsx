"use client";

import type { Game } from "@game-platform/shared";
import { useMemo, useSyncExternalStore } from "react";

import { GameCarousel } from "@/components/game-carousel";
import { selectHotSlugs, selectRecommended } from "@/lib/game-sections";
import {
  getFavoritesSnapshot,
  getRecentlyPlayedSnapshot,
  getServerFavoritesSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeFavorites,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

export function HomeRuleRecommendations({
  games,
  large = false,
}: {
  games: Game[];
  large?: boolean;
}) {
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

  const picks = useMemo(
    () => selectRecommended(games, recentlyPlayed, favorites, 8),
    [games, recentlyPlayed, favorites]
  );
  const hotSlugs = useMemo(() => selectHotSlugs(games), [games]);

  if (picks.length === 0) return null;

  return (
    <GameCarousel
      title="Recommended"
      games={picks}
      hotSlugs={hotSlugs}
      large={large}
    />
  );
}
