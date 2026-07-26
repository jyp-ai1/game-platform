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
import { Container, cn } from "@game-platform/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    if (!bootReady) return;
    const id = window.setTimeout(() => setShowSkeleton(false), 220);
    return () => window.clearTimeout(id);
  }, [bootReady]);

  return (
    <div className="relative flex flex-1 flex-col" aria-busy={!bootReady}>
      {showSkeleton ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 motion-base transition-opacity",
            bootReady ? "opacity-0" : "opacity-100"
          )}
          aria-hidden={bootReady}
        >
          <HomePageSkeleton />
        </div>
      ) : null}

      <div
        className={cn(
          "flex flex-1 flex-col motion-base transition-opacity",
          bootReady ? "opacity-100" : "opacity-0"
        )}
        aria-hidden={!bootReady}
      >
        <ReplayTogetherStrip snakeGame={snakeGame} />

        <HomeContinueHub games={games} />

        <HomeRuleRecommendations games={games} large />

        <HomePeopleFirstStrip />

        <section
          aria-labelledby="home-mission-heading"
          className="border-t border-white/5 py-5 sm:py-6"
        >
          <Container className="grid gap-3 sm:grid-cols-2">
            <HomeDailyChallengeStrip games={games} compact />
            <NotificationCenter compact />
          </Container>
        </section>

        <ReplayTimelineStrip games={games} />

        <section
          aria-labelledby="home-explore-heading"
          className="border-t border-white/5 py-5 sm:py-6 opacity-80"
        >
          <Container>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="home-explore-heading" className="text-base font-semibold text-muted-foreground">
                  혼자 탐험
                </h2>
                <p className="text-xs text-muted-foreground">{games.length}개 게임 · Party 없을 때</p>
              </div>
              <Link
                href="/games"
                className="motion-base shrink-0 rounded-xl border border-white/15 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40"
              >
                Browse All →
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {popular.map((g) => (
                <Link
                  key={g.slug}
                  href={`/games/${g.slug}`}
                  className="motion-base rounded-full border border-white/10 bg-card/60 px-4 py-2 text-sm transition-colors hover:border-primary/40"
                >
                  {g.title}
                </Link>
              ))}
            </div>
          </Container>
        </section>
      </div>
    </div>
  );
}
