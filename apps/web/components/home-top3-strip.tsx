"use client";

import { getGamePlayCounts, subscribeEngagement } from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { getLeaderboard, type LeaderboardEntry } from "@/lib/supabase/scores";

const EMPTY: Record<string, number> = {};
function getServerCounts(): Record<string, number> {
  return EMPTY;
}

export function HomeTop3Strip({ games }: { games: Game[] }) {
  const playCounts = useSyncExternalStore(
    subscribeEngagement,
    getGamePlayCounts,
    getServerCounts
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
    <section className="py-4">
      <Container>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Top 3</h2>
          <Link
            href={`/games/${topGame.slug}#leaderboard`}
            className="text-xs text-primary hover:underline"
          >
            {topGame.title} →
          </Link>
        </div>
        {entries === null ? (
          <p className="mt-2 text-sm text-muted-foreground">…</p>
        ) : entries.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">첫 기록을 남겨보세요</p>
        ) : (
          <ol className="mt-3 flex gap-2">
            {entries.map((e, i) => (
              <li
                key={`${e.nickname}-${i}`}
                className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-card/60 px-3 py-3 backdrop-blur"
              >
                <span className="text-xs text-muted-foreground">#{i + 1}</span>
                <span className="truncate text-sm font-medium">{e.nickname}</span>
                <span className="text-xs tabular-nums text-primary">{e.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
      </Container>
    </section>
  );
}
