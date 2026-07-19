"use client";

import type { Game } from "@game-platform/shared";
import { useSyncExternalStore } from "react";

import {
  getRecentlyPlayedSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

import { GameCarousel } from "./game-carousel";

export function RecentlyPlayedSection({ games }: { games: Game[] }) {
  const slugs = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );

  const bySlug = new Map(games.map((game) => [game.slug, game]));
  const recentGames = slugs
    .map((slug) => bySlug.get(slug))
    .filter((game): game is Game => game !== undefined);

  return (
    <GameCarousel
      title="❤️ Continue Playing"
      description="최근에 플레이한 게임입니다."
      games={recentGames}
    />
  );
}
