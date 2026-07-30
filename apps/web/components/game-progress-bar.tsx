"use client";

import { getGroupDifficulty, loadGameProgress } from "@game-platform/game-sdk";
import { ScoreBox } from "@game-platform/ui";

function formatBestTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
}

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
      {progress.retryCount > 0 ? (
        <ScoreBox label="Retries" value={progress.retryCount} />
      ) : null}
      {progress.bestTimeMs != null ? (
        <ScoreBox label="Best Time" value={formatBestTime(progress.bestTimeMs)} />
      ) : null}
    </div>
  );
}
