"use client";

import {
  getDeviceId,
  getGamePlayCounts,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Badge, SectionTitle } from "@game-platform/ui";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { DailyChallengeCard } from "@/components/daily-challenge-card";
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

function TopPlayerRow({ game, rankLabel }: { game: Game; rankLabel: string }) {
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getMyRank(game.slug, getDeviceId(), "weekly")
      .then((r) => {
        if (active) setRank(r);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [game.slug]);

  return (
    <Link
      href={`/games/${game.slug}#leaderboard`}
      className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/40"
    >
      <div>
        <p className="font-medium">{game.title}</p>
        <p className="text-xs text-muted-foreground">{rankLabel}</p>
      </div>
      <span className="text-sm font-bold text-primary">
        {rank !== null ? `#${rank}` : "—"}
      </span>
    </Link>
  );
}

export function CommunityHub({ games }: { games: Game[] }) {
  const playCounts = useSyncExternalStore(
    subscribeEngagement,
    getGamePlayCounts,
    getServerGamePlayCountsSnapshot
  );

  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const topGames = topPlayedSlugs(playCounts, 5)
    .map((slug) => bySlug.get(slug))
    .filter((g): g is Game => g !== undefined);

  return (
    <div className="flex flex-col gap-12">
      <section>
        <SectionTitle
          title="🏆 Top Players"
          description="내가 플레이한 게임의 주간 랭킹"
        />
        {topGames.length > 0 ? (
          <div className="mt-4 flex flex-col gap-2">
            {topGames.map((game, index) => (
              <TopPlayerRow key={game.slug} game={game} rankLabel={`Top ${index + 1} 게임`} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            게임을 플레이하면 주간 랭킹이 표시됩니다.{" "}
            <Link href="/games" className="text-primary underline">
              게임 시작
            </Link>
          </p>
        )}
      </section>

      <DailyChallengeCard />

      <section>
        <SectionTitle title="💬 Community" description="소셜 기능 (MVP)" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { title: "댓글", desc: "게임별 토론" },
            { title: "리뷰", desc: "별점 & 후기" },
            { title: "최근 활동", desc: "친구 피드" },
            { title: "공유", desc: "점수 & 기록 공유" },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-dashed bg-card/40 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{item.title}</p>
                <Badge variant="outline">Soon</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
