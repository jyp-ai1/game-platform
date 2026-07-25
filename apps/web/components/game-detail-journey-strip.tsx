"use client";

import { getBestScore, getServerBestScoreSnapshot, subscribeBestScore } from "@game-platform/game-sdk";
import { useCallback, useSyncExternalStore } from "react";

import { getCurrentStage, getNextStage, getStageProgress } from "@/lib/game-stages";
import { subscribeLiveData } from "@/lib/live-data-bus";

export function GameDetailJourneyStrip({ slug }: { slug: string }) {
  const bestScore = useSyncExternalStore(
    useCallback((l: () => void) => subscribeBestScore(slug, l), [slug]),
    () => getBestScore(slug),
    () => getServerBestScoreSnapshot(slug)
  );

  useSyncExternalStore(subscribeLiveData, () => bestScore, () => 0);

  const stage = getCurrentStage(slug, bestScore);
  const next = getNextStage(slug, bestScore);
  const progress = getStageProgress(slug, bestScore);

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-primary/5 to-card/50 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold">Your Journey</h3>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-lg bg-primary/10 px-2 py-1 font-medium text-primary">
          {stage.label}
        </span>
        {next ? (
          <>
            <span className="text-muted-foreground">→ {next.label}</span>
            <div className="h-1.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </>
        ) : (
          <span className="text-emerald-400">All stages cleared!</span>
        )}
      </div>
    </section>
  );
}
