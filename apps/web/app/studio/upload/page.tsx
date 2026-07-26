import { Suspense } from "react";

import { CreatorStudioShell } from "@/components/creator-studio-shell";
import { CreatorUploadWizard } from "@/components/creator-upload-wizard";

export const metadata = { title: "Upload Game — Studio" };

export default function StudioUploadPage() {
  return (
    <CreatorStudioShell>
      <Suspense>
        <CreatorUploadWizard />
      </Suspense>
    </CreatorStudioShell>
  );
}
