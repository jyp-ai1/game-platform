import { Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";

import { LibraryHub } from "@/components/library-hub";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  title: "Library",
  description: "Your Steam-style game library — recently played, favorites, collections",
};

export const revalidate = 60;

export default async function LibraryPage() {
  const games = await getGames();

  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <Container>
        <SectionTitle
          title="Library"
          description="Recently Played · Favorites · Completed · Wishlist · Collections"
        />
        <div className="mt-8">
          <LibraryHub games={games} />
        </div>
      </Container>
    </main>
  );
}
