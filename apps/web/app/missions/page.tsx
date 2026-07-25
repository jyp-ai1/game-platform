import { Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";

import { MissionHub } from "@/components/mission-hub";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  title: "Missions",
  description: "Why play today — daily missions, streak, rewards",
};

export default async function MissionsPage() {
  const games = await getGames();
  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <Container>
        <SectionTitle title="Replay Missions" description="플레이 이유 · XP · Coin · Streak" />
        <div className="mt-8">
          <MissionHub games={games} />
        </div>
      </Container>
    </main>
  );
}
