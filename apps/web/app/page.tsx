import type { Game } from "@game-platform/shared";
import { REALTIME_GAMES } from "@game-platform/multiplayer-sdk";

import { HomePageClient } from "@/components/home-page-client";
import { selectPopular } from "@/lib/game-sections";
import {
  buildLocalMvpGame,
  resolveLocalThumb,
} from "@/lib/local-mvp-games";
import { mergeCatalogGames } from "@/lib/creator/creator-game-catalog";
import { getGames } from "@/lib/supabase/games";
import { buildHomeMetadata } from "@/lib/seo";

export const metadata = buildHomeMetadata();
export const revalidate = 60;

export default async function Home() {
  const rawGames = await getGames();
  const games = mergeCatalogGames(rawGames);
  const popular = selectPopular(games, 8);
  const snakeGame = games.find((g) => g.slug === "snake") ?? null;

  const multiplayerGames: Game[] = [];
  for (const slug of REALTIME_GAMES) {
    if (slug === "snake") continue;
    const fromDb = games.find((g) => g.slug === slug);
    if (fromDb) {
      const thumb = resolveLocalThumb(slug, fromDb.thumbnailUrl);
      multiplayerGames.push(
        thumb === fromDb.thumbnailUrl ? fromDb : { ...fromDb, thumbnailUrl: thumb }
      );
    } else {
      const local = buildLocalMvpGame(slug);
      if (local) multiplayerGames.push(local);
    }
  }

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