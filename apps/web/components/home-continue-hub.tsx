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
    <section className="py-5 sm:py-8">
      <Container>
        {featured ? (
          <div className="space-y-4">
            <ContinuePlayingCard game={featured} featured />
            {rest.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {rest.map((game) => (
                  <ContinuePlayingCard key={game.id} game={game} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-primary/20 bg-gradient-to-br from-primary/10 to-card/30 px-6 py-16 text-center backdrop-blur">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/games">Play</Link>}
            />
          </div>
        )}
      </Container>
    </section>
  );
}
