import { Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";
import { Suspense } from "react";

import { CommunityHub } from "@/components/community-hub";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  title: "Community",
  description: "랭킹, 도전, 커뮤니티 — 함께 즐기는 게임 생활",
};

export const revalidate = 60;

export default async function CommunityPage() {
  const games = await getGames();

  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <Container>
        <SectionTitle title="Community" />
        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading community…</p>}>
            <CommunityHub games={games} />
          </Suspense>
        </div>
      </Container>
    </main>
  );
}
