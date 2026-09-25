"use client";

import { useSyncExternalStore } from "react";
import {
  getEmptyLiveProgress,
  loadLiveProgress,
  subscribeLiveProfile,
} from "@game-platform/game-sdk";

function snapshot(slug: string) {
  return loadLiveProgress(slug);
}

export function LivePlayBadge({ slug }: { slug: string }) {
  const progress = useSyncExternalStore(
    subscribeLiveProfile,
    () => snapshot(slug),
    getEmptyLiveProgress
  );
  if (progress.playCount <= 0) return null;
  return (
    <p data-testid={`live-plays-${slug}`} className="text-[11px] text-cyan-200/80">
      Played {progress.playCount}
      {progress.recent
        ? ` · last ${progress.recent.outcome === "win" ? "WIN" : progress.recent.outcome === "loss" ? "LOSS" : "PLAY"}`
        : ""}
    </p>
  );
}
