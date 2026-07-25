import { CategoryLinks } from "@/components/category-links";
import { CmsBannerStrip } from "@/components/cms-banner-strip";
import { CmsNoticeBar } from "@/components/cms-notice-bar";
import { GameCarousel } from "@/components/game-carousel";
import { HomeContinueHub } from "@/components/home-continue-hub";
import { HomeGrowthPanel } from "@/components/home-growth-panel";
import { HomeIdentityHero } from "@/components/home-identity-hero";
import { HomeRecentStrip } from "@/components/home-recent-strip";
import { PersonalizedPicksSection } from "@/components/personalized-picks-section";
import { PlayerRankCard } from "@/components/player-rank-card";
import {
  selectByCategorySlug,
  selectBySlugs,
  selectHotSlugs,
  selectNew,
  selectPopular,
} from "@/lib/game-sections";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { fetchActiveBanners, fetchActiveFeatured, fetchActiveNotices } from "@/lib/supabase/cms";
import { getGames } from "@/lib/supabase/games";
import { buildHomeMetadata } from "@/lib/seo";

export const metadata = buildHomeMetadata();

export const revalidate = 60;

const SLOT_META: Record<
  string,
  { title: string; description: string; emoji: string }
> = {
  weekly_pick: { title: "Weekly Pick", description: "이번 주 추천 게임.", emoji: "✨" },
  editors_pick: { title: "Editor's Pick", description: "에디터 선정 게임.", emoji: "🎯" },
  trending: { title: "Trending", description: "지금 급상승 중.", emoji: "📈" },
  new_games: { title: "New Games", description: "새로 추가된 게임.", emoji: "🆕" },
  popular: { title: "Popular", description: "많이 즐기는 게임.", emoji: "⭐" },
};

export default async function Home() {
  const [games, banners, notices, featured, cmsEnabled, rankingEnabled] =
    await Promise.all([
      getGames(),
      fetchActiveBanners(),
      fetchActiveNotices(),
      fetchActiveFeatured(),
      isFeatureEnabled("cms"),
      isFeatureEnabled("ranking"),
    ]);
  const hotSlugs = selectHotSlugs(games);

  const featuredBySlot = featured.reduce<Record<string, string[]>>((acc, row) => {
    if (!acc[row.slot]) acc[row.slot] = [];
    acc[row.slot].push(row.game_slug);
    return acc;
  }, {});

  function gamesForSlot(slot: string, fallback: () => ReturnType<typeof selectPopular>) {
    const slugs = featuredBySlot[slot];
    if (slugs?.length) return selectBySlugs(games, slugs);
    return fallback();
  }

  return (
    <main className="flex flex-1 flex-col">
      <HomeIdentityHero />
      <HomeContinueHub games={games} />
      <HomeGrowthPanel />
      <HomeRecentStrip games={games} />
      {rankingEnabled ? <PlayerRankCard games={games} /> : null}

      {cmsEnabled ? <CmsNoticeBar notices={notices} /> : null}
      {cmsEnabled ? <CmsBannerStrip banners={banners} /> : null}

      {cmsEnabled ? (
        <>
          <GameCarousel
            title={`${SLOT_META.weekly_pick.emoji} ${SLOT_META.weekly_pick.title}`}
            description={SLOT_META.weekly_pick.description}
            games={gamesForSlot("weekly_pick", () => selectPopular(games))}
            hotSlugs={hotSlugs}
          />
          <GameCarousel
            title={`${SLOT_META.trending.emoji} ${SLOT_META.trending.title}`}
            description={SLOT_META.trending.description}
            games={gamesForSlot("trending", () => selectPopular(games))}
            hotSlugs={hotSlugs}
          />
          <GameCarousel
            title={`${SLOT_META.new_games.emoji} ${SLOT_META.new_games.title}`}
            description={SLOT_META.new_games.description}
            games={gamesForSlot("new_games", () => selectNew(games))}
            hotSlugs={hotSlugs}
          />
        </>
      ) : null}

      <CategoryLinks />
      <PersonalizedPicksSection games={games} />

      <GameCarousel
        title="🕹️ Arcade"
        description="클래식 아케이드 게임."
        games={selectByCategorySlug(games, "arcade")}
        hotSlugs={hotSlugs}
      />
      <GameCarousel
        title="🧩 Puzzle"
        description="두뇌를 쓰는 퍼즐 게임."
        games={selectByCategorySlug(games, "puzzle")}
        hotSlugs={hotSlugs}
      />
      <GameCarousel
        title="🏅 Sports"
        description="스포츠 캐주얼 게임."
        games={selectByCategorySlug(games, "sports")}
        hotSlugs={hotSlugs}
      />
    </main>
  );
}
