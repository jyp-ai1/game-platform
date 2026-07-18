import { CategoryLinks } from "@/components/category-links";
import { FavoritesSection } from "@/components/favorites-section";
import { GameSection } from "@/components/game-section";
import { Hero } from "@/components/hero";
import { RecentlyPlayedSection } from "@/components/recently-played-section";
import {
  selectComingSoon,
  selectFeatured,
  selectNew,
  selectPopular,
} from "@/lib/game-sections";
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

      <GameSection
        title="Featured Games"
        description="지금 가장 먼저 만나볼 수 있는 게임입니다."
        games={selectFeatured(games)}
      />

      <RecentlyPlayedSection games={games} />
      <FavoritesSection games={games} />

      <GameSection
        title="New"
        description="새롭게 추가된 게임입니다."
        games={selectNew(games)}
      />

      <GameSection
        title="Trending"
        description="지금 많이 즐기는 게임입니다. (임시 순위 — 실제 인기도 지표는 추후 추가됩니다)"
        games={selectPopular(games)}
      />

      <GameSection
        title="Coming Soon"
        description="곧 만나볼 수 있는 게임입니다."
        games={selectComingSoon(games)}
      />

      <GameSection
        id="games"
        title="All Games"
        description="Play29의 전체 게임 목록입니다."
        games={games}
      />
    </main>
  );
}
