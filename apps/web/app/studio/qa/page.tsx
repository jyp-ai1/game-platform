import { CreatorStudioShell } from "@/components/creator-studio-shell";
import { CreatorAiQaPanel } from "@/components/creator-ai-qa-panel";

export const metadata = { title: "AI QA — Studio" };

export default function StudioQaPage() {
  return (
    <CreatorStudioShell>
      <CreatorAiQaPanel />
    </CreatorStudioShell>
  );
}
