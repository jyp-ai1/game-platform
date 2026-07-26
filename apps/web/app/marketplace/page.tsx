import { Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";

import { MarketplaceHub } from "@/components/marketplace-hub";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Games, templates, assets, sounds — Replay Marketplace",
};

export default function MarketplacePage() {
  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <Container>
        <SectionTitle title="Marketplace" />
        <div className="mt-8">
          <MarketplaceHub />
        </div>
      </Container>
    </main>
  );
}
