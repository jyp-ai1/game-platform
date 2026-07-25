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

  const [featured, ...rest] = recentGames;

  return (
    <section className="-mt-2 pb-4 pt-2 sm:pb-6">
      <Container>
        <h2 className="text-lg font-bold sm:text-xl">Continue</h2>

        {featured ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-2xl border border-primary/20 bg-card/80 shadow-lg shadow-primary/5 backdrop-blur">
              <ContinuePlayingCard game={featured} />
            </div>
            {rest.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {rest.map((game) => (
                  <ContinuePlayingCard key={game.id} game={game} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-card/30 px-4 py-8 text-center backdrop-blur">
            <Button nativeButton={false} render={<Link href="/games">Play your first game</Link>} />
          </div>
        )}
      </Container>
    </section>
  );
}
