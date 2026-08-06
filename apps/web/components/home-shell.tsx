"use client";

import type { Game } from "@game-platform/shared";
import dynamic from "next/dynamic";
import { Container, cn } from "@game-platform/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

import { HomePageSkeleton } from "@/components/home-page-skeleton";
import { HomeBrandHero } from "@/components/home-brand-hero";
import { HomeMultiplayerSection } from "@/components/home-multiplayer-section";
import { ReplayTogetherStrip } from "@/components/replay-together-strip";
import { useHomeBootDelay } from "@/lib/use-home-boot-delay";

const HomeContinueHub = dynamic(
  () => import("@/components/home-continue-hub").then((m) => ({ default: m.HomeContinueHub })),
  { ssr: false, loading: () => null }
);
const HomeRuleRecommendations = dynamic(
  () =>
    import("@/components/home-rule-recommendations").then((m) => ({
      default: m.HomeRuleRecommendations,
    })),
  { ssr: false, loading: () => null }
);
const HomePeopleFirstStrip = dynamic(
  () =>
    import("@/components/home-people-first-strip").then((m) => ({
      default: m.HomePeopleFirstStrip,
    })),
  { ssr: false, loading: () => null }
);
const HomeDailyChallengeStrip = dynamic(
  () =>
    import("@/components/home-daily-challenge-strip").then((m) => ({
      default: m.HomeDailyChallengeStrip,
    })),
  { ssr: false, loading: () => null }
);
const NotificationCenter = dynamic(
  () => import("@/components/notification-center").then((m) => ({ default: m.NotificationCenter })),
  { ssr: false, loading: () => null }
);
const ReplayTimelineStrip = dynamic(
  () =>
    import("@/components/replay-timeline-strip").then((m) => ({
      default: m.ReplayTimelineStrip,
    })),
  { ssr: false, loading: () => null }
);

function HomePopularSection({ games, popular }: { games: Game[]; popular: Game[] }) {
  return (
    <section
      aria-labelledby="home-popular-heading"
      className="border-t border-white/5 py-5 sm:py-6"
      data-testid="home-popular-section"
    >
      <Container>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="home-popular-heading" className="text-base font-semibold">
              Popular
            </h2>
            <p className="text-xs text-muted-foreground">{games.length}개 게임</p>
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
  );
}

export function HomeShell({
  games,
  snakeGame,
  popular,
  multiplayerGames = [],
}: {
  games: Game[];
  snakeGame: Game | null;
  popular: Game[];
  multiplayerGames?: Game[];
}) {
  const bootReady = useHomeBootDelay(500);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [belowFold, setBelowFold] = useState(false);

  useEffect(() => {
    if (!bootReady) return;
    const id = window.setTimeout(() => setShowSkeleton(false), 220);
    return () => window.clearTimeout(id);
  }, [bootReady]);

  useEffect(() => {
    if (!bootReady) return;
    const ric = window.requestIdleCallback?.(() => setBelowFold(true), { timeout: 1500 });
    if (ric != null) {
      return () => window.cancelIdleCallback(ric);
    }
    const t = window.setTimeout(() => setBelowFold(true), 100);
    return () => window.clearTimeout(t);
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
        <HomeBrandHero />
        <ReplayTogetherStrip />

        {bootReady ? (
          <>
            <HomeContinueHub games={games} />
            <HomeRuleRecommendations games={games} large />
            <HomePopularSection games={games} popular={popular} />
            <HomeMultiplayerSection
              snakeGame={snakeGame}
              multiplayerGames={multiplayerGames}
            />
          </>
        ) : null}

        {belowFold ? (
          <>
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
          </>
        ) : null}
      </div>
    </div>
  );
}
