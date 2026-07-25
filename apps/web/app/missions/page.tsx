import { Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";

import { MissionHub } from "@/components/mission-hub";

export const metadata: Metadata = {
  title: "Missions",
  description: "Daily, weekly, monthly, and season missions",
};

export default function MissionsPage() {
  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <Container>
        <SectionTitle title="Missions" description="Complete goals · Earn XP · Keep your streak" />
        <div className="mt-8">
          <MissionHub />
        </div>
      </Container>
    </main>
  );
}
