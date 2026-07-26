import { ReplayGreetingHero } from "@/components/replay-greeting-hero";
import { ReplayMotivationStrip } from "@/components/replay-motivation-strip";
import { ReplayTimelineStrip } from "@/components/replay-timeline-strip";
import { ReplayOffPlayStrip } from "@/components/replay-offplay-strip";
import { HomeChallengeStrip } from "@/components/home-challenge-strip";
import { HomeContinueHub } from "@/components/home-continue-hub";
import { HomeDailyChallengeStrip } from "@/components/home-daily-challenge-strip";
import { HomeRuleRecommendations } from "@/components/home-rule-recommendations";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { selectPopular } from "@/lib/game-sections";
import { getGames } from "@/lib/supabase/games";
import { buildHomeMetadata } from "@/lib/seo";

export const metadata = buildHomeMetadata();
export const revalidate = 60;

export default async function Home() {
  const games = await getGames();
  const popular = selectPopular(games, 4);

  return (
    <main className="flex flex-1 flex-col">
      {/* 나 → 성장 → 친구 → (게임) */}
      <ReplayGreetingHero games={games} />
      <ReplayMotivationStrip games={games} />
      <ReplayTimelineStrip games={games} />
      <ReplayOffPlayStrip games={games} />
      <HomeDailyChallengeStrip games={games} />
      <HomeContinueHub games={games} />
      <HomeChallengeStrip games={games} />
      <HomeRuleRecommendations games={games} large />
      <section className="border-t border-white/5 py-8">
        <Container>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">게임 탐험</h2>
              <p className="text-sm text-muted-foreground">{games.length}개 게임 · Replay 후 플레이</p>
            </div>
            <Link
              href="/games"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
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
    </main>
  );
}
