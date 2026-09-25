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

export function GameDetailLiveProgress({ slug }: { slug: string }) {
  const progress = useSyncExternalStore(
    subscribeLiveProfile,
    () => snapshot(slug),
    getEmptyLiveProgress
  );
  if (progress.playCount <= 0) return null;
  return (
    <p data-testid="game-detail-live-progress" className="text-xs text-cyan-200/85">
      Plays {progress.playCount}
      {progress.wins || progress.losses
        ? ` · ${progress.wins}W ${progress.losses}L`
        : ""}
      {progress.recent ? ` · last ${progress.recent.outcome}` : ""}
    </p>
  );
}
