import { CreatorStudioShell } from "@/components/creator-studio-shell";
import { CreatorCommentsPanel } from "@/components/creator-comments-panel";

export const metadata = { title: "Comments — Studio" };

export default function StudioCommentsPage() {
  return (
    <CreatorStudioShell>
      <CreatorCommentsPanel />
    </CreatorStudioShell>
  );
}
