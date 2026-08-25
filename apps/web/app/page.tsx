import type { Game } from "@game-platform/shared";
import { REALTIME_GAMES } from "@game-platform/multiplayer-sdk";

import { HomePageClient } from "@/components/home-page-client";
import { selectPopular } from "@/lib/game-sections";
import { getGames } from "@/lib/supabase/games";
import { buildHomeMetadata } from "@/lib/seo";

export const metadata = buildHomeMetadata();
export const revalidate = 60;

/** Local MVP card when Supabase catalog row is missing (Bomber). */
const LOCAL_MVP_MULTIPLAYER: Record<
  string,
  Pick<Game, "title" | "description" | "thumbnailUrl">
> = {
  bomber: {
    title: "Bomber",
    description: "캐릭터 · 색상 선택 후 바로 참가",
    thumbnailUrl: "/images/games/bomber.png",
  },
};

/** Fallback thumb when catalog row exists but thumbnail is empty. */
const MULTIPLAYER_THUMB_FALLBACK: Record<string, string> = {
  bomber: "/images/games/bomber.png",
};

function localMvpGame(slug: string): Game | null {
  const meta = LOCAL_MVP_MULTIPLAYER[slug];
  if (!meta) return null;
  const now = new Date().toISOString();
  return {
    id: `local-mvp-${slug}`,
    slug,
    title: meta.title,
    description: meta.description,
    thumbnailUrl: meta.thumbnailUrl ?? null,
    difficulty: "MEDIUM",
    status: "ACTIVE",
    sortOrder: 900,
    categoryId: null,
    category: null,
    isFeatured: true,
    tags: ["multiplayer", "realtime"],
    howToPlay: null,
    playCount: 0,
    nostalgiaNote: null,
    createdAt: now,
    updatedAt: now,
  };
}

export default async function Home() {
  const games = await getGames();
  const popular = selectPopular(games, 4);
  const snakeGame = games.find((g) => g.slug === "snake") ?? null;

  // Home Multiplayer strip: realtime flagships beyond Snake (agar, bomber).
  // Prefer DB rows; if missing (local MVP), still show the LIVE card.
  const multiplayerGames: Game[] = [];
  for (const slug of REALTIME_GAMES) {
    if (slug === "snake") continue;
    const fromDb = games.find((g) => g.slug === slug);
    if (fromDb) {
      const thumb = fromDb.thumbnailUrl ?? MULTIPLAYER_THUMB_FALLBACK[slug] ?? null;
      multiplayerGames.push(thumb === fromDb.thumbnailUrl ? fromDb : { ...fromDb, thumbnailUrl: thumb });
    } else {
      const local = localMvpGame(slug);
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
