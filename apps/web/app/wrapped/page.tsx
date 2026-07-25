import { Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";

import { WrappedExperience } from "@/components/wrapped-experience";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  title: "Replay Wrapped",
  description: "Your year in games — plays, genres, top games, shareable stats",
};

export const revalidate = 60;

export default async function WrappedPage() {
  const games = await getGames();

  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <Container className="max-w-3xl">
        <SectionTitle title="Replay Wrapped" description="Your game life, summarized" />
        <div className="mt-8">
          <WrappedExperience games={games} />
        </div>
      </Container>
    </main>
  );
}
