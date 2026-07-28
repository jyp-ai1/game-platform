"use client";

import { GameOverOverlay } from "@game-platform/ui";

import { loadGameProgress } from "./game-progress";

type GameOverVariant = "stage-clear" | "game-over";

export function StandardGameOverOverlay({
  gameSlug,
  score,
  stageLabel,
  isNewBest: isNewBestProp,
  bestRecordDelta: deltaProp,
  ...rest
}: {
  message?: string;
  onRestart: () => void;
  score?: number;
  gameSlug?: string;
  onRetry?: () => void;
  onExit?: () => void;
  onContinue?: () => void;
  variant?: GameOverVariant;
  stageLabel?: string;
  bestRecordDelta?: number;
  isNewBest?: boolean;
  stars?: number;
  onNextStage?: () => void;
}) {
  const progress = gameSlug ? loadGameProgress(gameSlug) : null;
  const isNewBest =
    isNewBestProp ??
    (score != null && progress != null && score > 0 && score >= progress.bestScore);
  const bestRecordDelta =
    deltaProp ??
    (isNewBest && score != null && progress
      ? score - progress.bestScore
      : undefined);

  const bestStageLabel =
    progress && progress.bestStage > 1 ? `Best Stage ${progress.bestStage}` : undefined;
  const mergedStageLabel =
    stageLabel ?? bestStageLabel ?? (progress ? `Best ${progress.bestScore.toLocaleString()}` : undefined);

  return (
    <GameOverOverlay
      {...rest}
      gameSlug={gameSlug}
      score={score}
      stageLabel={rest.variant === "stage-clear" ? stageLabel : mergedStageLabel}
      isNewBest={isNewBest}
      bestRecordDelta={bestRecordDelta && bestRecordDelta > 0 ? bestRecordDelta : undefined}
    />
  );
}
