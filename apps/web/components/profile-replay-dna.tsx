"use client";

import {
  getCategoryPlayCounts,
  getGamePlayCounts,
  getTotalPlayCount,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import { useMemo, useSyncExternalStore } from "react";

import { computeGameDnaBadges, getBadgeLabel } from "@/lib/game-dna";
import {
  getFavoritesSnapshot,
  getServerFavoritesSnapshot,
  subscribeFavorites,
} from "@/lib/local-storage";

const EMPTY: Record<string, number> = {};
function emptySnapshot() {
  return EMPTY;
}

export function ProfileReplayDna() {
  const totalPlays = useSyncExternalStore(subscribeEngagement, getTotalPlayCount, () => 0);
  const playCounts = useSyncExternalStore(
    subscribeEngagement,
    getGamePlayCounts,
    emptySnapshot
  );
  const categoryCounts = useSyncExternalStore(
    subscribeEngagement,
    getCategoryPlayCounts,
    emptySnapshot
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
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-card/80 to-primary/5 p-5 backdrop-blur">
      <h3 className="text-lg font-semibold">Replay DNA</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge}
            className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium"
          >
            {getBadgeLabel(badge)}
          </span>
        ))}
      </div>
    </section>
  );
}
