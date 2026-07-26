import { HomeShell } from "@/components/home-shell";
import { selectPopular } from "@/lib/game-sections";
import { getGames } from "@/lib/supabase/games";
import { buildHomeMetadata } from "@/lib/seo";

export const metadata = buildHomeMetadata();
export const revalidate = 60;

export default async function Home() {
  const games = await getGames();
  const popular = selectPopular(games, 4);
  const snakeGame = games.find((g) => g.slug === "snake") ?? null;

  return (
    <main className="flex flex-1 flex-col">
      <HomeShell games={games} snakeGame={snakeGame} popular={popular} />
    </main>
  );
}
