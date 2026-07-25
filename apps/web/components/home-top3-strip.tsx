"use client";

import { getGamePlayCounts, subscribeEngagement } from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { getLeaderboard, type LeaderboardEntry } from "@/lib/supabase/scores";

const EMPTY: Record<string, number> = {};

export function HomeTop3Strip({ games }: { games: Game[] }) {
  const playCounts = useSyncExternalStore(
    subscribeEngagement,
    getGamePlayCounts,
    () => EMPTY
  );
  const topSlug = Object.entries(playCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topGame = topSlug ? games.find((g) => g.slug === topSlug) : games[0];
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    if (!topGame) return;
    let active = true;
    getLeaderboard(topGame.slug, "weekly").then((data) => {
      if (active) setEntries(data.slice(0, 3));
    });
    return () => {
      active = false;
    };
  }, [topGame?.slug]);

  if (!topGame) return null;

  return (
    <section className="py-4 sm:py-6">
      <Container>
        <div className="rounded-3xl border border-white/10 bg-card/50 p-5 backdrop-blur sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold sm:text-2xl">Top Players</h2>
            <Link
              href={`/games/${topGame.slug}#leaderboard`}
              className="text-sm text-primary hover:underline"
            >
              {topGame.title} →
            </Link>
          </div>
          {entries === null ? (
            <div className="h-24 animate-pulse rounded-2xl bg-muted/40" />
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">—</p>
          ) : (
            <ol className="grid gap-3 sm:grid-cols-3">
              {entries.map((e, i) => (
                <li
                  key={`${e.nickname}-${i}`}
                  className="flex flex-col rounded-2xl border border-white/10 bg-background/40 px-4 py-5 text-center"
                >
                  <span className="text-sm text-muted-foreground">#{i + 1}</span>
                  <span className="mt-1 truncate text-lg font-semibold">{e.nickname}</span>
                  <span className="mt-1 text-2xl font-bold tabular-nums text-primary">
                    {e.score.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Container>
    </section>
  );
}
