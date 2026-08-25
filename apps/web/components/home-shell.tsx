"use client";

import type { Game } from "@game-platform/shared";
import dynamic from "next/dynamic";
import { Container, cn } from "@game-platform/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

import { HomePageSkeleton } from "@/components/home-page-skeleton";
import { HomeBrandHero } from "@/components/home-brand-hero";
import { HomeCatalogSections } from "@/components/home-catalog-sections";
import { HomeSearchStub } from "@/components/home-search-stub";
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

export function HomeShell({
  games,
  snakeGame,
  popular: _popular,
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
            <HomeSearchStub games={games} />
            <HomeCatalogSections
              games={games}
              snakeGame={snakeGame}
              multiplayerGames={multiplayerGames}
            />
            <HomeRuleRecommendations games={games} large />
            <div className="border-t border-white/5 py-4 text-center">
              <Link
                href="/creator"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-400/15"
                data-testid="home-ai-creator-soon"
              >
                AI Creator · SOON
              </Link>
            </div>
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
