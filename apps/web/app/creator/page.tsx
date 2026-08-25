import type { Metadata } from "next";

import { AiCreatorSoonPanel } from "@/components/ai-creator-soon-panel";

export const metadata: Metadata = {
  title: "AI Creator · SOON",
  robots: { index: false, follow: false },
};

/** Sprint 17 Step 5 — UI expose only, no real AI generator. */
export default function AiCreatorPage() {
  return <AiCreatorSoonPanel />;
}
