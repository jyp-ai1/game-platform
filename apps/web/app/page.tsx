import { HomeCollectionStrip } from "@/components/home-collection-strip";
import { HomeContinueHub } from "@/components/home-continue-hub";
import { HomeDailyChallengeStrip } from "@/components/home-daily-challenge-strip";
import { HomeFriendsStrip } from "@/components/home-friends-strip";
import { HomeHeatmapCompact } from "@/components/home-heatmap-compact";
import { HomeIdentityDashboard } from "@/components/home-identity-dashboard";
import { HomeMissionHub } from "@/components/home-mission-hub";
import { HomeRecentStrip } from "@/components/home-recent-strip";
import { HomeRuleRecommendations } from "@/components/home-rule-recommendations";
import { HomeTop3Strip } from "@/components/home-top3-strip";
import { HomeVisualHero } from "@/components/home-visual-hero";
import { Container } from "@game-platform/ui";
import { selectPopular } from "@/lib/game-sections";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getGames } from "@/lib/supabase/games";
import { buildHomeMetadata } from "@/lib/seo";

export const metadata = buildHomeMetadata();
export const revalidate = 60;

export default async function Home() {
  const [games, rankingEnabled] = await Promise.all([
    getGames(),
    isFeatureEnabled("ranking"),
  ]);
  const floatGames = selectPopular(games, 6);

  return (
    <main className="flex flex-1 flex-col">
      <HomeVisualHero floatGames={floatGames} />
      <HomeContinueHub games={games} />
      <HomeIdentityDashboard games={games} />
      <HomeDailyChallengeStrip />
      <HomeMissionHub />
      <section className="py-4">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2">
            <HomeHeatmapCompact />
            <HomeFriendsStrip />
          </div>
        </Container>
      </section>
      <HomeCollectionStrip games={games} />
      <HomeRecentStrip games={games} />
      {rankingEnabled ? <HomeTop3Strip games={games} /> : null}
      <HomeRuleRecommendations games={games} large />
    </main>
  );
}
