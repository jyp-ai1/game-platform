"use client";

import {
  getBestScore,
  getServerBestScoreSnapshot,
  subscribeBestScore,
} from "@game-platform/game-sdk";
import { Trophy } from "lucide-react";
import { useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";

export function CardBestScore({ slug }: { slug: string }) {
  const best = useSyncExternalStore(
    (cb) => {
      const u1 = subscribeBestScore(slug, cb);
      const u2 = subscribeLiveData(cb);
      return () => {
        u1();
        u2();
      };
    },
    () => getBestScore(slug),
    () => getServerBestScoreSnapshot(slug)
  );

  if (!best) return null;

  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Trophy className="size-3 text-brand-amber" />
      {best.toLocaleString()}
    </p>
  );
}
