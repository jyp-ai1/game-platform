import { HomePageClient } from "@/components/home-page-client";

import { selectPopular } from "@/lib/game-sections";

import { getGames } from "@/lib/supabase/games";

import { buildHomeMetadata } from "@/lib/seo";



export const metadata = buildHomeMetadata();

export const revalidate = 60;



export default async function Home() {

  const games = await getGames();

  const popular = selectPopular(games, 4);

  const snakeGame = games.find((g) => g.slug === "snake") ?? null;

  // Home Multiplayer strip: realtime flagships beyond Snake (agar).
  const multiplayerGames = games.filter((g) => g.slug === "agar");



  return (

    <main className="flex flex-1 flex-col">

      <HomePageClient
        games={games}
        snakeGame={snakeGame}
        popular={popular}
        multiplayerGames={multiplayerGames}
      />

    </main>

  );

}


