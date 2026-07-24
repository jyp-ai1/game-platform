import { CategoryLinks } from "@/components/category-links";
import { CmsBannerStrip } from "@/components/cms-banner-strip";
import { CmsNoticeBar } from "@/components/cms-notice-bar";
import { DailyChallengeCard } from "@/components/daily-challenge-card";
import { GameCarousel } from "@/components/game-carousel";
import { Hero } from "@/components/hero";
import { PersonalizedPicksSection } from "@/components/personalized-picks-section";
import { PlayerRankCard } from "@/components/player-rank-card";
import { RecentlyPlayedSection } from "@/components/recently-played-section";
import { SeasonCard } from "@/components/season-card";
import { WeeklyMissionCard } from "@/components/weekly-mission-card";
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

// Revalidate periodically so games added/edited in Supabase show up
// without requiring a new deploy.
export const revalidate = 60;

const SLOT_META: Record<
  string,
  { title: string; description: string; emoji: string }
> = {
  weekly_pick: { title: "이번주 추천", description: "운영자가 고른 이번주 추천 게임.", emoji: "✨" },
  editors_pick: { title: "Editor's Pick", description: "에디터가 직접 선정한 게임.", emoji: "🎯" },
  trending: { title: "Trending", description: "지금 급상승 중인 게임.", emoji: "📈" },
  new_games: { title: "신규 게임", description: "새롭게 추가된 게임입니다.", emoji: "🆕" },
  popular: { title: "인기 게임", description: "지금 많이 즐기는 게임입니다.", emoji: "⭐" },
};

export default async function Home() {
  const [games, banners, notices, featured, cmsEnabled, weeklyMissionEnabled, rankingEnabled] =
    await Promise.all([
      getGames(),
      fetchActiveBanners(),
      fetchActiveNotices(),
      fetchActiveFeatured(),
      isFeatureEnabled("cms"),
      isFeatureEnabled("weekly_mission"),
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
      <Hero />
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
            title={`${SLOT_META.editors_pick.emoji} ${SLOT_META.editors_pick.title}`}
            description={SLOT_META.editors_pick.description}
            games={gamesForSlot("editors_pick", () => selectPopular(games, 4))}
            hotSlugs={hotSlugs}
          />

          <GameCarousel
            title={`${SLOT_META.trending.emoji} ${SLOT_META.trending.title}`}
            description={SLOT_META.trending.description}
            games={gamesForSlot("trending", () => selectPopular(games))}
            hotSlugs={hotSlugs}
          />

          <GameCarousel
            title={`${SLOT_META.popular.emoji} ${SLOT_META.popular.title}`}
            description={SLOT_META.popular.description}
            games={gamesForSlot("popular", () => selectPopular(games))}
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

      <RecentlyPlayedSection games={games} />

      <PersonalizedPicksSection games={games} />

      <DailyChallengeCard />
      {weeklyMissionEnabled ? <WeeklyMissionCard /> : null}
      <SeasonCard />
      {rankingEnabled ? <PlayerRankCard games={games} /> : null}

      <GameCarousel
        title="🕹️ 추억의 오락실"
        description="오락실 감성을 그대로 담은 클래식 아케이드 게임."
        games={selectByCategorySlug(games, "arcade")}
        hotSlugs={hotSlugs}
      />

      <GameCarousel
        title="🧩 퍼즐 게임"
        description="머리를 써야 풀리는 퍼즐 게임."
        games={selectByCategorySlug(games, "puzzle")}
        hotSlugs={hotSlugs}
      />

      <GameCarousel
        title="👾 레트로 게임"
        description="90년대~2000년대 감성을 그대로 담은 레트로 게임."
        games={selectByCategorySlug(games, "retro")}
        hotSlugs={hotSlugs}
      />

      <GameCarousel
        title="🧠 두뇌 게임"
        description="기억력과 순발력을 겨루는 두뇌 게임."
        games={selectByCategorySlug(games, "brain")}
        hotSlugs={hotSlugs}
      />

      <GameCarousel
        title="🏅 스포츠 게임"
        description="스포츠 감성의 캐주얼 게임."
        games={selectByCategorySlug(games, "sports")}
        hotSlugs={hotSlugs}
      />
    </main>
  );
}
