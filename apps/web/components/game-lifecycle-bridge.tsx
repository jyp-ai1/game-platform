"use client";

import {
  getFavoritesSnapshot,
  getRecentlyPlayedSnapshot,
  getServerFavoritesSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeFavorites,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";
import { selectRecommended } from "@/lib/game-sections";
import type { UniversalRewardBundle } from "@/lib/reward-engine";
import {
  subscribeEngagement,
  subscribePlatformAnalyticsEvents,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { useEffect, useState, useSyncExternalStore } from "react";

import { GameResultModal } from "@/components/game-result-modal";
import { getGameFramework } from "@/lib/game-framework";

export function GameLifecycleBridge({
  slug,
  games,
  children,
}: {
  slug: string;
  games: Game[];
  children: React.ReactNode;
}) {
  const [result, setResult] = useState<{ score: number; rewards: UniversalRewardBundle } | null>(null);

  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );
  const recent = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );
  useSyncExternalStore(subscribeEngagement, () => 0, () => 0);

  useEffect(() => {
    const framework = getGameFramework(slug);
    return subscribePlatformAnalyticsEvents((event) => {
      if (event.type === "game-end" && event.gameSlug === slug) {
        const rewards = framework.onGameEnd(event.score, games);
        setResult({ score: event.score, rewards });
      }
    });
  }, [slug, games]);

  const recommend =
    selectRecommended(games, recent, favorites, 1)[0] ?? games.find((g) => g.slug !== slug);

  if (!result) return <>{children}</>;

  return (
    <>
      {children}
      <GameResultModal
        slug={slug}
        score={result.score}
        rewards={result.rewards}
        games={games}
        recommend={recommend}
        onClose={() => setResult(null)}
      />
    </>
  );
}
