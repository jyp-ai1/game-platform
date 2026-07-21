"use client";

import type { Game } from "@game-platform/shared";
import { Container, SectionTitle } from "@game-platform/ui";
import { useSyncExternalStore } from "react";

import { ContinuePlayingCard } from "@/components/continue-playing-card";
import {
  getRecentlyPlayedSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

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

  if (recentGames.length === 0) {
    return null;
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 border-b py-10 duration-500 sm:py-14">
      <Container>
        <SectionTitle
          title="❤️ Continue Playing"
          description="최근에 플레이한 게임입니다."
        />
        <div className="scrollbar-hide mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {recentGames.map((game) => (
            <div key={game.id} className="w-64 shrink-0 snap-start sm:w-72">
              <ContinuePlayingCard game={game} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
