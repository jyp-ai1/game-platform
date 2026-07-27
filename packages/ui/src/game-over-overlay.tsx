"use client";

import { useEffect, useState } from "react";

import { RotateCcw } from "lucide-react";

import { Button } from "./button";
import { cn } from "./lib/utils";

export type GameOverVariant = "stage-clear" | "game-over";

const STAGE_BUTTON_DELAY_MS = 800;

export function GameOverOverlay({
  message,
  onRestart,
  score,
  gameSlug,
  onRetry,
  onExit,
  variant = "game-over",
  stageLabel,
  bestRecordDelta,
  isNewBest,
  stars = 5,
  onNextStage,
}: {
  message?: string;
  onRestart: () => void;
  score?: number;
  gameSlug?: string;
  onRetry?: () => void;
  onExit?: () => void;
  variant?: GameOverVariant;
  stageLabel?: string;
  bestRecordDelta?: number;
  isNewBest?: boolean;
  stars?: number;
  onNextStage?: () => void;
}) {
  const [showStageActions, setShowStageActions] = useState(variant !== "stage-clear");

  useEffect(() => {
    if (variant !== "stage-clear") {
      setShowStageActions(true);
      return;
    }
    setShowStageActions(false);
    const timer = window.setTimeout(() => setShowStageActions(true), STAGE_BUTTON_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [variant, score, stageLabel]);

  function handleRetry() {
    onRetry?.();
    onRestart();
  }

  function handleExit() {
    onExit?.();
    if (gameSlug && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("replay:game-exit", { detail: { gameSlug } }));
    }
  }

  function handleNextStage() {
    if (onNextStage) {
      onNextStage();
      return;
    }
    handleRetry();
  }

  const shell = "absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 rounded-xl bg-background/95 px-4";

  if (variant === "stage-clear") {
    const title = stageLabel ?? message ?? "Stage Clear";
    const filled = Math.min(5, Math.max(0, stars));

    return (
      <div className={shell}>
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xl tracking-[0.35em] text-amber-400" aria-hidden>
            {"★ ".repeat(filled).trim()}
          </p>
          <p className="text-lg font-semibold">{title}</p>
          {score !== undefined ? (
            <>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Score</p>
              <p className="text-4xl font-bold tabular-nums">{score.toLocaleString()}</p>
            </>
          ) : null}
          {bestRecordDelta != null && bestRecordDelta > 0 ? (
            <p className="text-sm font-medium text-emerald-400">
              Best +{bestRecordDelta.toLocaleString()}
            </p>
          ) : isNewBest ? (
            <p className="text-sm font-medium text-emerald-400">New best!</p>
          ) : null}
        </div>
        {showStageActions ? (
          <div className="flex w-full max-w-sm flex-row gap-2">
            <Button variant="outline" onClick={handleExit} className="h-12 flex-1">
              종료
            </Button>
            <Button
              onClick={handleNextStage}
              className="h-12 flex-1 bg-violet-600 text-base font-semibold hover:bg-violet-500"
            >
              다음 Stage ▶
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Game Over
        </p>
        {score !== undefined ? (
          <>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Score</p>
            <p className="text-4xl font-bold tabular-nums">{score.toLocaleString()}</p>
          </>
        ) : null}
        {message && score == null ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
      </div>
      <div className="flex w-full max-w-sm flex-row gap-2">
        <Button onClick={handleRetry} className={cn("h-12 flex-1 gap-2 font-semibold")}>
          <RotateCcw className="size-4" />
          Retry
        </Button>
        <Button variant="outline" onClick={handleExit} className="h-12 flex-1">
          종료
        </Button>
      </div>
    </div>
  );
}
