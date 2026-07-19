import { CategoryLinks } from "@/components/category-links";
import { FavoritesSection } from "@/components/favorites-section";
import { GameCarousel } from "@/components/game-carousel";
import { GameSection } from "@/components/game-section";
import { Hero } from "@/components/hero";
import { RecentlyPlayedSection } from "@/components/recently-played-section";
import {
  selectByCategorySlug,
  selectByTag,
  selectComingSoon,
  selectFeatured,
  selectNew,
  selectPopular,
} from "@/lib/game-sections";
import { siteConfig } from "@/lib/site-config";
import { getGames } from "@/lib/supabase/games";

// Revalidate periodically so games added/edited in Supabase show up
// without requiring a new deploy.
export const revalidate = 60;

export default async function Home() {
  const games = await getGames();

  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <CategoryLinks />

      <GameCarousel
        title="🔥 Trending"
        description="지금 많이 즐기는 게임입니다."
        games={selectPopular(games)}
      />

      <GameCarousel
        title="🆕 New Games"
        description="새롭게 추가된 게임입니다."
        games={selectNew(games)}
      />

      <GameCarousel
        title="🕹 Retro Arcade"
        description="오락실 감성을 그대로 담은 클래식 아케이드 게임."
        games={selectByCategorySlug(games, "arcade")}
      />

      <GameCarousel
        title="🧩 Puzzle"
        description="머리를 써야 풀리는 퍼즐 게임."
        games={selectByCategorySlug(games, "puzzle")}
      />

      <GameCarousel
        title="🧠 Brain Games"
        description="기억력과 순발력을 겨루는 두뇌 게임."
        games={selectByCategorySlug(games, "brain")}
      />

      <GameCarousel
        title="⭐ Classic"
        description="세대를 넘어 사랑받은 클래식 게임."
        games={selectByCategorySlug(games, "classic")}
      />

      <RecentlyPlayedSection games={games} />
      <FavoritesSection games={games} />

      <GameCarousel
        title="🎯 Recommended"
        description="지금 가장 먼저 만나볼 수 있는 게임입니다."
        games={selectFeatured(games)}
      />

      <GameCarousel
        title="90~2000년대 인기 게임"
        description="그 시절 우리를 사로잡았던 바로 그 게임들."
        games={selectByTag(games, "90s-2000s")}
      />

      <GameCarousel
        title="오락실 명작에서 영감을 받은 게임"
        description="동전 넣고 즐기던 오락실의 그 감성을 그대로."
        games={selectByTag(games, "arcade-classic")}
      />

      <GameCarousel
        title="3분 안에 즐기는 추억"
        description="짧지만 강렬한, 딱 3분이면 충분한 게임들."
        games={selectByTag(games, "quick-play")}
      />

      <GameCarousel
        title="Coming Soon"
        description="곧 만나볼 수 있는 게임입니다."
        games={selectComingSoon(games)}
      />

      <GameSection
        id="games"
        title="All Games"
        description={`${siteConfig.name}의 전체 게임 목록입니다.`}
        games={games}
      />
    </main>
  );
}
