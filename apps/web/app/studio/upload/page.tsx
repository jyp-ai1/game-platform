import { CreatorStudioShell } from "@/components/creator-studio-shell";
import { ExternalGameRegisterForm } from "@/components/external-game-register-form";

export const metadata = { title: "Register Game — Studio" };

export default function StudioUploadPage() {
  return (
    <CreatorStudioShell>
      <ExternalGameRegisterForm />
    </CreatorStudioShell>
  );
}
