"use client";

import { getBestScore } from "@game-platform/game-sdk";
import { Trophy } from "lucide-react";
import { useSyncExternalStore } from "react";

// Same pattern as my-best-score.tsx: a one-shot localStorage read via
// useSyncExternalStore's dual-snapshot API, avoiding an SSR/hydration
// mismatch without needing a subscription (best score never changes from
// outside this component while it's mounted).
function noopSubscribe() {
  return () => {};
}

function getServerSnapshot() {
  return 0;
}

export function CardBestScore({ slug }: { slug: string }) {
  const best = useSyncExternalStore(
    noopSubscribe,
    () => getBestScore(slug),
    getServerSnapshot
  );

  if (!best) {
    return null;
  }

  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Trophy className="size-3 text-brand-amber" />
      내 최고 {best.toLocaleString()}
    </p>
  );
}
