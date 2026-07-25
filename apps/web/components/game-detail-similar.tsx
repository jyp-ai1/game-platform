"use client";

import type { Game } from "@game-platform/shared";
import { GameCarousel } from "@/components/game-carousel";
import { selectHotSlugs } from "@/lib/game-sections";

export function GameDetailSimilar({ games, related }: { games: Game[]; related: Game[] }) {
  if (related.length === 0) return null;
  return (
    <GameCarousel
      title="Similar"
      games={related}
      hotSlugs={selectHotSlugs(games)}
    />
  );
}
