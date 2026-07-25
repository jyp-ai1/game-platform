"use client";

import type { Game } from "@game-platform/shared";
import { useSyncExternalStore } from "react";

import { GameCard } from "@/components/game-card";
import {
  getRecentlyPlayedSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

export function GameDetailRecentStrip({ games, currentSlug }: { games: Game[]; currentSlug: string }) {
  const slugs = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );
  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const recent = slugs
    .filter((s) => s !== currentSlug)
    .map((s) => bySlug.get(s))
    .filter((g): g is Game => g !== undefined)
    .slice(0, 4);

  if (recent.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold">Recent</h3>
      <div className="scrollbar-hide mt-3 flex gap-3 overflow-x-auto pb-1">
        {recent.map((game) => (
          <div key={game.id} className="w-44 shrink-0">
            <GameCard game={game} />
          </div>
        ))}
      </div>
    </div>
  );
}
