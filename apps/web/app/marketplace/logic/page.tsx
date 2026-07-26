import { Container, SectionTitle } from "@game-platform/ui";

import { LogicMarketplacePanel } from "@/components/logic-marketplace-panel";

export const metadata = { title: "Logic Marketplace" };

export default function LogicMarketplacePage() {
  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <Container>
        <SectionTitle title="Logic Marketplace" />
        <div className="mt-8">
          <LogicMarketplacePanel />
        </div>
      </Container>
    </main>
  );
}
