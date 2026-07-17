import { Container, SectionTitle } from "@game-platform/ui";

import { GameGrid } from "@/components/game-grid";
import { Hero } from "@/components/hero";
import { getGames } from "@/lib/supabase/games";

const FEATURED_GAME_COUNT = 4;

// Revalidate periodically so games added/edited in Supabase show up
// without requiring a new deploy.
export const revalidate = 60;

export default async function Home() {
  const games = await getGames();
  const featuredGames = games.slice(0, FEATURED_GAME_COUNT);

  return (
    <main className="flex flex-1 flex-col">
      <Hero />

      <section className="border-b py-20">
        <Container>
          <SectionTitle
            title="Featured Games"
            description="지금 가장 먼저 만나볼 수 있는 게임입니다."
          />
          <div className="mt-8">
            <GameGrid games={featuredGames} />
          </div>
        </Container>
      </section>

      <section id="games" className="scroll-mt-14 py-20">
        <Container>
          <SectionTitle
            title="All Games"
            description="Play29의 전체 게임 목록입니다."
          />
          <div className="mt-8">
            <GameGrid games={games} />
          </div>
        </Container>
      </section>
    </main>
  );
}
