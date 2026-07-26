import { CreatorStudioShell } from "@/components/creator-studio-shell";
import { CreatorStudioDashboard } from "@/components/creator-studio-dashboard";

export const metadata = { title: "Creator Studio" };

export default function StudioPage() {
  return (
    <CreatorStudioShell>
      <CreatorStudioDashboard />
    </CreatorStudioShell>
  );
}
