"use client";

import type { Game } from "@game-platform/shared";

import { HomeContinueHub } from "@/components/home-continue-hub";
import { HomeDailyChallengeStrip } from "@/components/home-daily-challenge-strip";
import { HomePageSkeleton } from "@/components/home-page-skeleton";
import { HomePeopleFirstStrip } from "@/components/home-people-first-strip";
import { HomeRuleRecommendations } from "@/components/home-rule-recommendations";
import { NotificationCenter } from "@/components/notification-center";
import { ReplayTimelineStrip } from "@/components/replay-timeline-strip";
import { ReplayTogetherStrip } from "@/components/replay-together-strip";
import { Container } from "@game-platform/ui";
import Link from "next/link";

import { useHomeBootDelay } from "@/lib/use-home-boot-delay";

export function HomeShell({
  games,
  snakeGame,
  popular,
}: {
  games: Game[];
  snakeGame: Game | null;
  popular: Game[];
}) {
  const bootReady = useHomeBootDelay(500);

  if (!bootReady) {
    return <HomePageSkeleton />;
  }

  return (
    <>
      <ReplayTogetherStrip snakeGame={snakeGame} />

      <HomeContinueHub games={games} />

      <HomeRuleRecommendations games={games} large />

      <HomePeopleFirstStrip />

      <section className="border-t border-white/5 py-4">
        <Container className="grid gap-3 sm:grid-cols-2">
          <HomeDailyChallengeStrip games={games} compact />
          <NotificationCenter compact />
        </Container>
      </section>

      <ReplayTimelineStrip games={games} />

      <section className="border-t border-white/5 py-6 opacity-80">
        <Container>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-muted-foreground">혼자 탐험</h2>
              <p className="text-xs text-muted-foreground">{games.length}개 게임 · Party 없을 때</p>
            </div>
            <Link
              href="/games"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-muted-foreground"
            >
              Browse All →
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {popular.map((g) => (
              <Link
                key={g.slug}
                href={`/games/${g.slug}`}
                className="rounded-full border border-white/10 bg-card/60 px-4 py-2 text-sm transition-colors hover:border-primary/40"
              >
                {g.title}
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
