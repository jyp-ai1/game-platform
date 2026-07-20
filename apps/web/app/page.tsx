import { CategoryLinks } from "@/components/category-links";
import { DailyChallengeCard } from "@/components/daily-challenge-card";
import { GameCarousel } from "@/components/game-carousel";
import { Hero } from "@/components/hero";
import { RecentlyPlayedSection } from "@/components/recently-played-section";
import {
  selectByCategorySlug,
  selectHotSlugs,
  selectNew,
  selectPopular,
} from "@/lib/game-sections";
import { getGames } from "@/lib/supabase/games";

// Revalidate periodically so games added/edited in Supabase show up
// without requiring a new deploy.
export const revalidate = 60;

export default async function Home() {
  const games = await getGames();
  const hotSlugs = selectHotSlugs(games);

  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <CategoryLinks />

      <RecentlyPlayedSection games={games} hotSlugs={hotSlugs} />

      <DailyChallengeCard />

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
        title="🧠 두뇌 게임"
        description="기억력과 순발력을 겨루는 두뇌 게임."
        games={selectByCategorySlug(games, "brain")}
        hotSlugs={hotSlugs}
      />

      <GameCarousel
        title="⭐ 인기 게임"
        description="지금 많이 즐기는 게임입니다."
        games={selectPopular(games)}
        hotSlugs={hotSlugs}
      />

      <GameCarousel
        title="🆕 신규 게임"
        description="새롭게 추가된 게임입니다."
        games={selectNew(games)}
        hotSlugs={hotSlugs}
      />
    </main>
  );
}
