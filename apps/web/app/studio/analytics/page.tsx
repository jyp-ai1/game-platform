import { CreatorStudioShell } from "@/components/creator-studio-shell";
import { CreatorAnalyticsPanel } from "@/components/creator-analytics-panel";

export const metadata = { title: "Analytics — Studio" };

export default function StudioAnalyticsPage() {
  return (
    <CreatorStudioShell>
      <CreatorAnalyticsPanel />
    </CreatorStudioShell>
  );
}
