import type { Metadata } from "next";

import { GameSection } from "@/components/game-section";
import { selectHotSlugs } from "@/lib/game-sections";
import { siteConfig } from "@/lib/site-config";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  title: "전체 게임",
};

export const revalidate = 60;

export default async function AllGamesPage() {
  const games = await getGames();
  const hotSlugs = selectHotSlugs(games);

  return (
    <main className="flex flex-1 flex-col py-16">
      <GameSection
        title="전체 게임"
        description={`${siteConfig.name}의 전체 게임 목록입니다.`}
        games={games}
        hotSlugs={hotSlugs}
      />
    </main>
  );
}
