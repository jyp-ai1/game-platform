"use client";

import {
  getDeviceId,
  getGamePlayCounts,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Container, SectionTitle } from "@game-platform/ui";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { getMyRank } from "@/lib/supabase/scores";

const EMPTY_PLAY_COUNTS: Record<string, number> = {};
function getServerGamePlayCountsSnapshot(): Record<string, number> {
  return EMPTY_PLAY_COUNTS;
}

function topPlayedSlugs(counts: Record<string, number>, limit: number): string[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug]) => slug);
}

function GameRankRow({ game }: { game: Game }) {
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getMyRank(game.slug, getDeviceId(), "all")
      .then((r) => {
        if (active) setRank(r);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [game.slug]);

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
      <Link href={`/games/${game.slug}`} className="font-medium hover:underline">
        {game.title}
      </Link>
      <span className="text-sm font-semibold text-primary">
        {rank !== null ? `#${rank}` : "미랭킹"}
      </span>
    </div>
  );
}

// Shows this device's rank in the 1-2 games it has actually played the
// most -- reuses the existing per-game get_my_rank lookup (Epic 3), no new
// cross-game ranking concept.
export function PlayerRankCard({ games }: { games: Game[] }) {
  const playCounts = useSyncExternalStore(
    subscribeEngagement,
    getGamePlayCounts,
    getServerGamePlayCountsSnapshot
  );

  const bySlug = new Map(games.map((game) => [game.slug, game]));
  const rankedGames = topPlayedSlugs(playCounts, 2)
    .map((slug) => bySlug.get(slug))
    .filter((game): game is Game => game !== undefined);

  if (rankedGames.length === 0) {
    return null;
  }

  return (
    <section className="border-b py-10 sm:py-14">
      <Container>
        <SectionTitle
          title="🥇 내 랭킹"
          description="가장 많이 플레이한 게임의 내 순위입니다."
        />
        <div className="mt-6 flex flex-col gap-3 sm:max-w-md">
          {rankedGames.map((game) => (
            <GameRankRow key={game.slug} game={game} />
          ))}
        </div>
      </Container>
    </section>
  );
}
