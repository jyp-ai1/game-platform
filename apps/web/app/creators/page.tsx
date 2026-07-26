import { Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";

import { CreatorHub } from "@/components/creator-hub";
import { CreatorCommunityPanel } from "@/components/creator-community-panel";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  title: "Creators",
  description: "Make games, publish, grow — Replay Creator Platform",
};

export const revalidate = 60;

export default async function CreatorsPage() {
  const games = await getGames();

  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <Container>
        <SectionTitle title="Creators" />
        <div className="mt-8 space-y-12">
          <CreatorHub games={games} />
          <CreatorCommunityPanel games={games} />
        </div>
      </Container>
    </main>
  );
}
