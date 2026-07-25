"use client";

import { getBestScore, getServerBestScoreSnapshot, subscribeBestScore } from "@game-platform/game-sdk";
import type { Difficulty } from "@game-platform/shared";
import { useSyncExternalStore } from "react";

import { formatDifficulty } from "@/lib/difficulty";
import { getGameBalanceMeta } from "@/lib/game-balance";
import { getCurrentStage, getNextStage, getStageProgress, getStagesForGame } from "@/lib/game-stages";
import { subscribeLiveData } from "@/lib/live-data-bus";

export function GameDetailStagePanel({
  slug,
  difficulty,
}: {
  slug: string;
  difficulty: Difficulty;
}) {
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

  const balance = getGameBalanceMeta(slug, difficulty);
  const stages = getStagesForGame(slug);
  const current = getCurrentStage(slug, best);
  const next = getNextStage(slug, best);
  const progress = getStageProgress(slug, best);

  return (
    <div className="rounded-2xl border border-white/10 bg-card/50 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Stages</h3>
        <span className="text-xs text-muted-foreground">
          {formatDifficulty(difficulty)} · {balance.playTimeLabel}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {stages.map((s) => (
          <span
            key={s.index}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              best >= s.target
                ? "border border-primary/40 bg-primary/15 text-primary"
                : "border border-white/10 text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
        ))}
      </div>
      {next ? (
        <div className="mt-4">
          <div className="flex justify-between text-xs">
            <span>{current.label} → {next.label}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
