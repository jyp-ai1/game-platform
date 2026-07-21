import { Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";

import { ProfileClient } from "@/components/profile-client";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  title: "내 프로필",
};

export const revalidate = 60;

export default async function ProfilePage() {
  const games = await getGames();

  return (
    <main className="flex flex-1 flex-col py-16">
      <Container>
        <SectionTitle
          title="내 프로필"
          description="지금까지의 플레이 기록과 성장을 확인하세요."
        />
        <div className="mt-8">
          <ProfileClient games={games} />
        </div>
      </Container>
    </main>
  );
}
