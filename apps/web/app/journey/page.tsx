import { Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";

import { JourneyHub } from "@/components/journey-hub";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  title: "Journey",
  description: "내 게임 여정 — 이어하기, 컬렉션, 플레이 기록",
};

export const revalidate = 60;

export default async function JourneyPage() {
  const games = await getGames();

  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <Container>
        <SectionTitle
          title="My Journey"
          description="이어하기, 컬렉션, 플레이 기록 — 내 게임 생활의 타임라인"
        />
        <div className="mt-8">
          <JourneyHub games={games} />
        </div>
      </Container>
    </main>
  );
}
