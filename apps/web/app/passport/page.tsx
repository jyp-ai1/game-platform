import type { Metadata } from "next";

import { ReplayPassportPanel } from "@/components/replay-passport-panel";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  title: "Replay Passport",
  description: "Your game life — Level, Collection, Journey, Achievements",
};

export default async function PassportPage() {
  const games = await getGames();
  return (
    <main className="flex flex-1 flex-col">
      <ReplayPassportPanel games={games} />
    </main>
  );
}
