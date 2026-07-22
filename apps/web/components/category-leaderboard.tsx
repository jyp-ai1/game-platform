"use client";

import { getDeviceId } from "@game-platform/game-sdk";
import { Container, SectionTitle } from "@game-platform/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getLeaderboard,
  getMyRank,
  type LeaderboardEntry,
} from "@/lib/supabase/scores";

// "카테고리별 랭킹" reuses each game's own existing leaderboard/rank
// endpoints -- scores across games in a category (e.g. 2048's thousands vs.
// Tic Tac Toe's win count) aren't comparable, so this is a grouped view of
// per-game rankings, not a new cross-game aggregate.
function GameRankMini({ slug, title }: { slug: string; title: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getLeaderboard(slug, "all", 3).then((data) => {
      if (active) setEntries(data);
    });
    getMyRank(slug, getDeviceId(), "all")
      .then((rank) => {
        if (active) setMyRank(rank);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/games/${slug}`} className="font-medium hover:underline">
          {title}
        </Link>
        {myRank !== null ? (
          <span className="shrink-0 text-xs font-medium text-primary">
            내 순위 #{myRank}
          </span>
        ) : null}
      </div>

      {entries === null ? (
        <p className="mt-2 text-xs text-muted-foreground">불러오는 중...</p>
      ) : entries.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          아직 기록이 없습니다.
        </p>
      ) : (
        <ol className="mt-2 flex flex-col gap-1">
          {entries.map((entry, index) => (
            <li
              key={`${entry.nickname}-${index}`}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="w-4 text-muted-foreground">{index + 1}</span>
                {entry.nickname}
              </span>
              <span className="font-semibold tabular-nums">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function CategoryLeaderboard({
  games,
}: {
  games: { slug: string; title: string }[];
}) {
  if (games.length === 0) {
    return null;
  }

  return (
    <Container className="mt-16">
      <SectionTitle
        title="🏆 카테고리 랭킹"
        description="이 카테고리 게임들의 순위를 한눈에 확인하세요."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <GameRankMini key={game.slug} slug={game.slug} title={game.title} />
        ))}
      </div>
    </Container>
  );
}
