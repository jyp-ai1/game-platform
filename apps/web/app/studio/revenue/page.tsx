import { CreatorStudioShell } from "@/components/creator-studio-shell";
import { CreatorRevenuePanel } from "@/components/creator-revenue-panel";

export const metadata = { title: "Revenue — Studio" };

export default function StudioRevenuePage() {
  return (
    <CreatorStudioShell>
      <CreatorRevenuePanel />
    </CreatorStudioShell>
  );
}
