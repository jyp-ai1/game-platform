import { NocodeStudioWizard } from "@/components/nocode-studio-wizard";
import { CreatorStudioShell } from "@/components/creator-studio-shell";

export const metadata = { title: "Create Game — No Code" };

export default function StudioCreatePage() {
  return (
    <CreatorStudioShell>
      <NocodeStudioWizard />
    </CreatorStudioShell>
  );
}
