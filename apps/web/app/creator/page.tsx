import type { Metadata } from "next";

import { CreatorPipelinePanel } from "@/components/creator-pipeline-panel";

export const metadata: Metadata = {
  title: "AI Creator · SOON",
  robots: { index: false, follow: false },
};

/** Sprint 23 — Creator pipeline (stub generate; AI engine SOON). */
export default function AiCreatorPage() {
  return <CreatorPipelinePanel />;
}
