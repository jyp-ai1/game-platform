/**
 * Sprint 14.3 — Puzzle group stage ladder (original-style progression).
 * Endless games (2048 tile chase) keep engine rules; these params scale difficulty.
 */
import { getGameRuleGroup } from "./game-rule-groups";

export interface PuzzleStageParams {
  stageIndex: number;
  label: string;
  /** Grid dimension, mine count, tube count, etc. — slug-specific interpretation */
  size: number;
  /** Timer pressure multiplier (1 = normal) */
  timeMult: number;
  /** Target / complexity step */
  target: number;
}

const DEFAULT: PuzzleStageParams = {
  stageIndex: 1,
  label: "Stage 1",
  size: 4,
  timeMult: 1,
  target: 1,
};

/** Per-slug stage curves — stageIndex 1-based, capped at 10. */
const PUZZLE_STAGES: Record<string, (idx: number) => PuzzleStageParams> = {
  samegame: (idx) => ({
    stageIndex: idx,
    label: `Stage ${idx}`,
    size: Math.min(12, 8 + idx),
    timeMult: 1,
    target: 500 + idx * 400,
  }),
  "sliding-puzzle": (idx) => ({
    stageIndex: idx,
    label: `Stage ${idx}`,
    size: Math.min(5, 3 + Math.floor((idx - 1) / 2)),
    timeMult: 1,
    target: 1000 - idx * 50,
  }),
  "ball-sort": (idx) => ({
    stageIndex: idx,
    label: `Stage ${idx}`,
    size: Math.min(7, 4 + idx),
    timeMult: 1,
    target: idx,
  }),
  "color-sort": (idx) => ({
    stageIndex: idx,
    label: `Stage ${idx}`,
    size: Math.min(6, 3 + idx),
    timeMult: 1,
    target: idx,
  }),
  "merge-blocks": (idx) => ({
    stageIndex: idx,
    label: `Stage ${idx}`,
    size: 6,
    timeMult: Math.max(0.55, 1 - (idx - 1) * 0.06),
    target: 512 * idx,
  }),
  minesweeper: (idx) => ({
    stageIndex: idx,
    label: `Stage ${idx}`,
    size: Math.min(12, 8 + idx),
    timeMult: 1,
    target: Math.min(25, 8 + idx * 2),
  }),
  nonogram: (idx) => ({
    stageIndex: idx,
    label: `Stage ${idx}`,
    size: Math.min(10, 5 + idx),
    timeMult: 1,
    target: idx,
  }),
  kakuro: (idx) => ({
    stageIndex: idx,
    label: `Stage ${idx}`,
    size: Math.min(6, 4 + Math.floor(idx / 2)),
    timeMult: 1,
    target: idx,
  }),
  crossword: (idx) => ({
    stageIndex: idx,
    label: `Stage ${idx}`,
    size: Math.min(8, 5 + idx),
    timeMult: 1,
    target: idx,
  }),
  "word-search": (idx) => ({
    stageIndex: idx,
    label: `Stage ${idx}`,
    size: Math.min(12, 8 + idx),
    timeMult: 1,
    target: 3 + idx,
  }),
  jigsaw: (idx) => ({
    stageIndex: idx,
    label: `Stage ${idx}`,
    size: Math.min(5, 3 + Math.floor((idx - 1) / 2)),
    timeMult: 1,
    target: idx,
  }),
  sudoku: (idx) => ({
    stageIndex: idx,
    label: `Stage ${idx}`,
    size: 9,
    timeMult: 1,
    target: idx,
  }),
  "color-match": (idx) => ({
    stageIndex: idx,
    label: `Round ${idx}`,
    size: 6,
    timeMult: Math.max(0.5, 1 - (idx - 1) * 0.05),
    target: idx * 10,
  }),
};

export function getPuzzleStage(slug: string, stageIndex = 1): PuzzleStageParams {
  const group = getGameRuleGroup(slug);
  if (group?.id !== "puzzle") {
    return { ...DEFAULT, stageIndex: Math.max(1, stageIndex) };
  }
  const idx = Math.max(1, Math.min(10, stageIndex));
  const fn = PUZZLE_STAGES[slug];
  return fn ? fn(idx) : { ...DEFAULT, stageIndex: idx, label: `Stage ${idx}` };
}
