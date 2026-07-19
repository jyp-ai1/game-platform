"use client";

import type { Game } from "@game-platform/shared";
import { useSyncExternalStore } from "react";

import {
  getFavoritesSnapshot,
  getServerFavoritesSnapshot,
  subscribeFavorites,
} from "@/lib/local-storage";

import { GameCarousel } from "./game-carousel";

export function FavoritesSection({ games }: { games: Game[] }) {
  const slugs = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );

  const bySlug = new Map(games.map((game) => [game.slug, game]));
  const favoriteGames = slugs
    .map((slug) => bySlug.get(slug))
    .filter((game): game is Game => game !== undefined);

  return (
    <GameCarousel
      title="즐겨찾기"
      description="즐겨찾기한 게임입니다."
      games={favoriteGames}
    />
  );
}
