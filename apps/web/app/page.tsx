import { HomeDailyChallengeStrip } from "@/components/home-daily-challenge-strip";
import { HomeContinueHub } from "@/components/home-continue-hub";
import { HomeRetentionHub } from "@/components/home-retention-hub";
import { HomeRuleRecommendations } from "@/components/home-rule-recommendations";
import { HomeTop3Strip } from "@/components/home-top3-strip";
import { HomeVisualHero } from "@/components/home-visual-hero";
import { selectHotSlugs, selectPopular } from "@/lib/game-sections";
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
  const floatGames = selectPopular(games, 4);

  return (
    <main className="flex flex-1 flex-col">
      <HomeVisualHero floatGames={floatGames} />
      <HomeContinueHub games={games} />
      <HomeDailyChallengeStrip />
      <HomeRetentionHub />
      {rankingEnabled ? <HomeTop3Strip games={games} /> : null}
      <HomeRuleRecommendations games={games} large />
    </main>
  );
}
