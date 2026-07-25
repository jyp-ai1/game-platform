"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { GameCard } from "@/components/game-card";
import {
  getRecentlyPlayedSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

export function HomeRecentStrip({ games }: { games: Game[] }) {
  const slugs = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );

  const bySlug = new Map(games.map((game) => [game.slug, game]));
  const recentGames = slugs
    .map((slug) => bySlug.get(slug))
    .filter((game): game is Game => game !== undefined);

  if (recentGames.length === 0) {
    return null;
  }

  return (
    <section className="border-b py-4 sm:py-6">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-base font-semibold sm:text-lg">🕐 최근 플레이</h2>
          <Link href="/library" className="text-sm font-medium text-primary hover:underline">
            Library →
          </Link>
        </div>
        <div className="scrollbar-hide mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {recentGames.map((game) => (
            <div key={game.id} className="w-56 shrink-0 snap-start sm:w-64">
              <GameCard game={game} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
