import type { Metadata } from "next";

import { RankingHubPage } from "@/components/ranking-hub";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = { title: "Rankings" };

export default async function RankingPage() {
  const games = await getGames();
  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <RankingHubPage games={games} />
    </main>
  );
}
