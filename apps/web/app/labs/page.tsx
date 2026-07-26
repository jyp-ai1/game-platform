import { Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";

import { ReplayLabsHub } from "@/components/replay-labs-hub";

export const metadata: Metadata = {
  title: "Replay Labs",
  description: "Experimental features — promote what works",
};

export default function LabsPage() {
  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <Container>
        <ReplayLabsHub />
      </Container>
    </main>
  );
}
