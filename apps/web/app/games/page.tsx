import type { Metadata } from "next";

import { GamesDiscoveryBrowser } from "@/components/games-discovery-browser";
import { Container, SectionTitle } from "@game-platform/ui";

import { selectHotSlugs } from "@/lib/game-sections";
import { mergeLocalMvpGames } from "@/lib/local-mvp-games";
import { buildGamesListMetadata } from "@/lib/seo";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = buildGamesListMetadata();

export const revalidate = 60;

export default async function AllGamesPage() {
  const games = mergeLocalMvpGames(await getGames());
  const hotSlugs = selectHotSlugs(games);

  return (
    <main className="flex flex-1 flex-col py-16">
      <section className="py-8">
        <Container>
          <SectionTitle
            title="Discover"
            description="인기 · 최신 · Multiplayer · 검색으로 게임을 고르세요."
          />
          <div className="mt-8">
            <GamesDiscoveryBrowser games={games} hotSlugs={hotSlugs} />
          </div>
        </Container>
      </section>
    </main>
  );
}