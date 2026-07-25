import { ReplayOffPlayStrip } from "@/components/replay-offplay-strip";
import { ContinueReminderBanner } from "@/components/continue-reminder-banner";
import { HomeChallengeStrip } from "@/components/home-challenge-strip";
import { HomeContinueHub } from "@/components/home-continue-hub";
import { HomeDailyChallengeStrip } from "@/components/home-daily-challenge-strip";
import { HomeMissionHub } from "@/components/home-mission-hub";
import { HomeRuleRecommendations } from "@/components/home-rule-recommendations";
import { ReplayIdentityHero } from "@/components/replay-identity-hero";
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
      <ContinueReminderBanner games={games} />
      <ReplayOffPlayStrip games={games} />
      <HomeContinueHub games={games} />
      <ReplayIdentityHero games={games} />
      <HomeDailyChallengeStrip />
      <HomeMissionHub />
      <HomeChallengeStrip games={games} />
      <HomeRuleRecommendations games={games} large />
      <section className="border-t border-white/5 py-8">
        <Container>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">게임 탐험</h2>
              <p className="text-sm text-muted-foreground">{games.length}개 게임 · 무료 · 설치 없음</p>
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
