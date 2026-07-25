"use client";

import type { Game } from "@game-platform/shared";
import { Button, Container, SectionTitle } from "@game-platform/ui";
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
    <section className="border-b py-10 sm:py-14">
      <Container>
        <SectionTitle
          title="▶ Continue Playing"
          description="이어서 플레이할 게임 — 내 게임 생활의 중심입니다."
        />

        {recentGames.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentGames.map((game) => (
              <ContinuePlayingCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed bg-card/40 p-8 text-center">
            <p className="text-lg font-semibold">아직 플레이 기록이 없습니다</p>
            <p className="mt-2 text-sm text-muted-foreground">
              첫 게임을 시작하면 여기에 이어하기 카드가 표시됩니다.
            </p>
            <Button
              className="mt-6"
              nativeButton={false}
              render={<Link href="/games">첫 게임 시작하기</Link>}
            />
          </div>
        )}
      </Container>
    </section>
  );
}
