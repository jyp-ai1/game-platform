import { Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";

import { getGames } from "@/lib/supabase/games";

import { FavoritesClient } from "./favorites-client";

export const metadata: Metadata = {
  title: "즐겨찾기",
};

export const revalidate = 60;

export default async function FavoritesPage() {
  const games = await getGames();

  return (
    <main className="flex flex-1 flex-col py-16">
      <Container>
        <SectionTitle
          title="즐겨찾기"
          description="즐겨찾기한 게임입니다."
        />
        <div className="mt-8">
          <FavoritesClient games={games} />
        </div>
      </Container>
    </main>
  );
}
