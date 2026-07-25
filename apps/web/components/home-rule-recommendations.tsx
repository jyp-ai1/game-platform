"use client";

import {
  getDailyStreak,
  getGamePlayCounts,
  getDailyMission,
  getServerDailyMissionSnapshot,
  getServerDailyStreakSnapshot,
  isDailyChallengeComplete,
  subscribeEngagement,
  subscribeMissions,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { useMemo, useSyncExternalStore } from "react";

import { GameCarousel } from "@/components/game-carousel";
import { selectHotSlugs } from "@/lib/game-sections";
import {
  getFavoritesSnapshot,
  getRecentlyPlayedSnapshot,
  getServerFavoritesSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeFavorites,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";
import { subscribeLiveData } from "@/lib/live-data-bus";
import {
  recommendGames,
  topRecommendationReason,
} from "@/lib/recommendation-engine";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";

export function HomeRuleRecommendations({
  games,
  large = false,
}: {
  games: Game[];
  large?: boolean;
}) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
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
  const streak = useSyncExternalStore(
    subscribeEngagement,
    getDailyStreak,
    getServerDailyStreakSnapshot
  );
  const mission = useSyncExternalStore(
    subscribeMissions,
    getDailyMission,
    getServerDailyMissionSnapshot
  );
  const playCounts = useSyncExternalStore(
    subscribeEngagement,
    getGamePlayCounts,
    () => ({})
  );

  const replayScore = useMemo(
    () => buildWrappedSnapshot(games).replayScore,
    [games, recentlyPlayed, favorites, streak]
  );

  const picks = useMemo(
    () =>
      recommendGames(games, {
        recentlyPlayed,
        favorites,
        streak: streak.currentStreak,
        missionIncomplete: !isDailyChallengeComplete(mission),
        replayScore,
        playCounts,
      }, 8),
    [games, recentlyPlayed, favorites, streak, mission, replayScore, playCounts]
  );

  const reason = useMemo(
    () =>
      topRecommendationReason(games, {
        recentlyPlayed,
        favorites,
        streak: streak.currentStreak,
        missionIncomplete: !isDailyChallengeComplete(mission),
        replayScore,
        playCounts,
      }),
    [games, recentlyPlayed, favorites, streak, mission, replayScore, playCounts]
  );

  const hotSlugs = useMemo(() => selectHotSlugs(games), [games]);

  if (picks.length === 0) return null;

  return (
    <GameCarousel
      title={`Recommended · ${reason}`}
      games={picks}
      hotSlugs={hotSlugs}
      large={large}
    />
  );
}
