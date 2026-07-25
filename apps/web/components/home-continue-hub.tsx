"use client";

import type { Game } from "@game-platform/shared";
import { Button, Container } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { ContinuePlayingCard } from "@/components/continue-playing-card";
import {
  getRecentlyPlayedSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

export function HomeContinueHub({ games }: { games: Game[] }) {
  const slugs = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );

  const bySlug = new Map(games.map((game) => [game.slug, game]));
  const recentGames = slugs
    .map((slug) => bySlug.get(slug))
    .filter((game): game is Game => game !== undefined)
    .slice(0, 3);

  return (
    <section className="border-b py-4 sm:py-6">
      <Container>
        <h2 className="text-base font-semibold sm:text-lg">▶ Continue Playing</h2>

        {recentGames.length > 0 ? (
          <div className="scrollbar-hide mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 sm:overflow-visible">
            {recentGames.map((game) => (
              <div key={game.id} className="w-[min(100%,280px)] shrink-0 snap-start sm:w-auto">
                <ContinuePlayingCard game={game} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed bg-card/40 px-4 py-5 text-center sm:py-6">
            <p className="text-sm font-medium">첫 게임을 시작해보세요</p>
            <Button
              className="mt-3"
              size="sm"
              nativeButton={false}
              render={<Link href="/games">Discover Games</Link>}
            />
          </div>
        )}
      </Container>
    </section>
  );
}
