"use client";

import { getBestScore } from "@game-platform/game-sdk";
import { useSyncExternalStore } from "react";

// Best score never changes from outside this component while it's mounted
// (no cross-tab sync needed for a casual game platform), so subscribe is a
// no-op — useSyncExternalStore is used purely for its dual snapshot API,
// which avoids the SSR/client hydration mismatch a plain useState+useEffect
// read of localStorage would cause.
function noopSubscribe() {
  return () => {};
}

function getServerSnapshot() {
  return 0;
}

export function MyBestScore({ gameSlug }: { gameSlug: string }) {
  const best = useSyncExternalStore(
    noopSubscribe,
    () => getBestScore(gameSlug),
    getServerSnapshot
  );

  if (!best) {
    return null;
  }

  return (
    <p className="text-sm text-muted-foreground">
      내 최고 기록:{" "}
      <span className="font-semibold text-foreground">
        {best.toLocaleString()}
      </span>
    </p>
  );
}
