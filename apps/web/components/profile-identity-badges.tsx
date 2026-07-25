"use client";

import {
  getCategoryPlayCounts,
  getGamePlayCounts,
  getTotalPlayCount,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import { Badge } from "@game-platform/ui";
import { useMemo, useSyncExternalStore } from "react";

import {
  computeGameDnaBadges,
  getBadgeLabel,
  type GameDnaBadge,
} from "@/lib/game-dna";
import {
  getFavoritesSnapshot,
  getServerFavoritesSnapshot,
  subscribeFavorites,
} from "@/lib/local-storage";

const EMPTY_COUNTS: Record<string, number> = {};
function getServerGamePlayCountsSnapshot(): Record<string, number> {
  return EMPTY_COUNTS;
}
function getServerCategoryPlayCountsSnapshot(): Record<string, number> {
  return EMPTY_COUNTS;
}

export function ProfileIdentityBadges({ level }: { level: number }) {
  const totalPlays = useSyncExternalStore(
    subscribeEngagement,
    getTotalPlayCount,
    () => 0
  );
  const playCounts = useSyncExternalStore(
    subscribeEngagement,
    getGamePlayCounts,
    getServerGamePlayCountsSnapshot
  );
  const categoryCounts = useSyncExternalStore(
    subscribeEngagement,
    getCategoryPlayCounts,
    getServerCategoryPlayCountsSnapshot
  );
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );

  const badges = useMemo(
    () =>
      computeGameDnaBadges({
        totalPlays,
        favoriteCount: favorites.length,
        categoryPlayCounts: categoryCounts,
        distinctGamesPlayed: Object.keys(playCounts).length,
      }),
    [totalPlays, favorites.length, categoryCounts, playCounts]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="text-sm font-semibold">
        Lv.{level}
      </Badge>
      {badges.map((badge: GameDnaBadge) => (
        <Badge key={badge} variant="outline">
          {getBadgeLabel(badge)}
        </Badge>
      ))}
    </div>
  );
}
