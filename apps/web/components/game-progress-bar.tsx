"use client";

import { getGroupDifficulty, loadGameProgress } from "@game-platform/game-sdk";
import { ScoreBox } from "@game-platform/ui";

/** Platform HUD — Best Score / Best Stage / Play Count for all 50 games. */
export function GameProgressBar({ slug }: { slug: string }) {
  const progress = loadGameProgress(slug);
  const stage = getGroupDifficulty(slug, progress.currentStage);

  return (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-2 px-1">
      <ScoreBox label={stage.label} value={stage.stageIndex} />
      <ScoreBox label="Best" value={progress.bestScore} />
      <ScoreBox label="Plays" value={progress.playCount} />
      {progress.bestStage > 1 ? (
        <ScoreBox label="Best St" value={progress.bestStage} />
      ) : null}
    </div>
  );
}
