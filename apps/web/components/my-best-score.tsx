"use client";

import {
  getBestScore,
  getServerBestScoreSnapshot,
  subscribeBestScore,
} from "@game-platform/game-sdk";
import { useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";

function useLiveBestScore(gameSlug: string): number {
  const fromStore = useSyncExternalStore(
    (cb) => {
      const u1 = subscribeBestScore(gameSlug, cb);
      const u2 = subscribeLiveData(cb);
      return () => {
        u1();
        u2();
      };
    },
    () => getBestScore(gameSlug),
    () => getServerBestScoreSnapshot(gameSlug)
  );
  return fromStore;
}

export function MyBestScore({ gameSlug }: { gameSlug: string }) {
  const best = useLiveBestScore(gameSlug);

  if (!best) return null;

  return (
    <p className="text-sm text-muted-foreground">
      Best{" "}
      <span className="font-semibold tabular-nums text-foreground">
        {best.toLocaleString()}
      </span>
    </p>
  );
}
