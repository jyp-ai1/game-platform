import { HomeDailyChallengeStrip } from "@/components/home-daily-challenge-strip";
import { HomeDailyGoal } from "@/components/home-daily-goal";
import { HomeContinueHub } from "@/components/home-continue-hub";
import { HomeRecentStrip } from "@/components/home-recent-strip";
import { HomeRuleRecommendations } from "@/components/home-rule-recommendations";
import { HomeTop3Strip } from "@/components/home-top3-strip";
import { HomeVisualHero } from "@/components/home-visual-hero";
import { GameCarousel } from "@/components/game-carousel";
import {
  selectByCategorySlug,
  selectHotSlugs,
  selectPopular,
} from "@/lib/game-sections";
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
  const hotSlugs = selectHotSlugs(games);
  const floatGames = selectPopular(games, 4);

  return (
    <main className="flex flex-1 flex-col">
      <HomeVisualHero floatGames={floatGames} />
      <HomeContinueHub games={games} />
      <HomeDailyChallengeStrip />
      <HomeDailyGoal />
      {rankingEnabled ? <HomeTop3Strip games={games} /> : null}
      <HomeRecentStrip games={games} />
      <HomeRuleRecommendations games={games} />

      <GameCarousel
        title="Popular"
        description=""
        games={selectPopular(games, 8)}
        hotSlugs={hotSlugs}
      />
      <GameCarousel
        title="Puzzle"
        description=""
        games={selectByCategorySlug(games, "puzzle", 8)}
        hotSlugs={hotSlugs}
      />
    </main>
  );
}
