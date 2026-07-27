/** Stage mode persistence — current stage, run score, best run (Sprint 13.5 QA). */
import { clearSave, getBestScore, loadGame, saveGame, setBestScore } from "@game-platform/game-sdk";

export const SNAKE_STAGE_SAVE_SLUG = "snake-stage";

export interface SnakeStageSaveState {
  stageIndex: number;
  runScore: number;
  bestRunScore: number;
}

export function loadSnakeStageSave(): SnakeStageSaveState | null {
  const raw = loadGame<SnakeStageSaveState>(SNAKE_STAGE_SAVE_SLUG);
  if (!raw || typeof raw.stageIndex !== "number") return null;
  return {
    stageIndex: Math.max(0, raw.stageIndex),
    runScore: Math.max(0, raw.runScore ?? 0),
    bestRunScore: Math.max(0, raw.bestRunScore ?? 0),
  };
}

export function persistSnakeStageSave(state: SnakeStageSaveState): void {
  saveGame(SNAKE_STAGE_SAVE_SLUG, state);
}

export function clearSnakeStageSave(): void {
  clearSave(SNAKE_STAGE_SAVE_SLUG);
}

/** Sync stage run best into platform best-score + save blob. */
export function recordSnakeStageBest(runScore: number): void {
  const prev = loadSnakeStageSave();
  const bestRun = Math.max(runScore, prev?.bestRunScore ?? 0, getBestScore("snake"));
  persistSnakeStageSave({
    stageIndex: prev?.stageIndex ?? 0,
    runScore: prev?.runScore ?? 0,
    bestRunScore: bestRun,
  });
  if (runScore > getBestScore("snake")) {
    setBestScore("snake", runScore);
  }
}
