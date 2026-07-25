import type { Metadata } from "next";

import { JourneyHub } from "@/components/journey-hub";
import { Container, SectionTitle } from "@game-platform/ui";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  title: "Journey",
  description: "Your Replay story — scores, missions, collections, challenges",
};

export default async function JourneyPage() {
  const games = await getGames();
  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <Container>
        <SectionTitle
          title="Replay Journey"
          description="오늘의 기록 · 미션 · 컬렉션 · 도전 — 당신의 게임 스토리"
        />
        <div className="mt-8">
          <JourneyHub games={games} />
        </div>
      </Container>
    </main>
  );
}
