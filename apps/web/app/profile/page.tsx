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
          title="My Profile"
          description="게임 인생 — 레벨, 기록, 업적을 한곳에서"
        />
        <div className="mt-8">
          <ProfileClient games={games} />
        </div>
      </Container>
    </main>
  );
}
