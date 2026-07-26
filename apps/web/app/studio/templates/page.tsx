import { CreatorStudioShell } from "@/components/creator-studio-shell";
import { TemplateMarketplacePanel } from "@/components/template-marketplace-panel";

export const metadata = { title: "Templates — Studio" };

export default function StudioTemplatesPage() {
  return (
    <CreatorStudioShell>
      <TemplateMarketplacePanel />
    </CreatorStudioShell>
  );
}
