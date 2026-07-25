import type { Metadata } from "next";

import { GamesDiscoveryBrowser } from "@/components/games-discovery-browser";
import { Container, SectionTitle } from "@game-platform/ui";

import { selectHotSlugs } from "@/lib/game-sections";
import { buildGamesListMetadata } from "@/lib/seo";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = buildGamesListMetadata();

export const revalidate = 60;

export default async function AllGamesPage() {
  const games = await getGames();
  const hotSlugs = selectHotSlugs(games);

  return (
    <main className="flex flex-1 flex-col py-16">
      <section className="py-8">
        <Container>
          <SectionTitle
            title="Discover"
            description="Browse by category, tag, mood, difficulty — AI picks for you."
          />
          <div className="mt-8">
            <GamesDiscoveryBrowser games={games} hotSlugs={hotSlugs} />
          </div>
        </Container>
      </section>
    </main>
  );
}
