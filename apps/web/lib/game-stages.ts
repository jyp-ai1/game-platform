/**
 * Universal stage system — auto-generated targets per game profile.
 */
export type StageProfile = "score" | "merge" | "round";

export interface GameStage {
  index: number;
  label: string;
  target: number;
}

const MERGE_GAMES = new Set(["2048", "merge-blocks"]);
const ROUND_GAMES = new Set([
  "memory",
  "minesweeper",
  "sudoku",
  "crossword",
  "word-search",
  "nonogram",
  "kakuro",
  "jigsaw",
  "hangman",
  "tic-tac-toe",
  "connect4",
  "checkers",
  "chess",
  "chess960",
  "reversi",
  "gomoku",
]);

export function getStageProfile(slug: string): StageProfile {
  if (MERGE_GAMES.has(slug)) return "merge";
  if (ROUND_GAMES.has(slug)) return "round";
  return "score";
}

function scoreStages(): GameStage[] {
  return [
    { index: 1, label: "Lv.1", target: 100 },
    { index: 2, label: "Lv.2", target: 300 },
    { index: 3, label: "Lv.3", target: 600 },
    { index: 4, label: "Lv.4", target: 1000 },
    { index: 5, label: "Lv.5", target: 2000 },
  ];
}

function mergeStages(): GameStage[] {
  return [
    { index: 1, label: "2048", target: 2048 },
    { index: 2, label: "4096", target: 4096 },
    { index: 3, label: "8192", target: 8192 },
    { index: 4, label: "16384", target: 16384 },
  ];
}

function roundStages(): GameStage[] {
  return [
    { index: 1, label: "Round 1", target: 1 },
    { index: 2, label: "Round 2", target: 2 },
    { index: 3, label: "Round 3", target: 3 },
    { index: 4, label: "Round 4", target: 4 },
    { index: 5, label: "Round 5", target: 5 },
  ];
}

export function getStagesForGame(slug: string): GameStage[] {
  const profile = getStageProfile(slug);
  if (profile === "merge") return mergeStages();
  if (profile === "round") return roundStages();
  return scoreStages();
}

export function getCurrentStage(slug: string, score: number): GameStage {
  const stages = getStagesForGame(slug);
  let current = stages[0];
  for (const stage of stages) {
    if (score >= stage.target) current = stage;
    else break;
  }
  return current;
}

export function getNextStage(slug: string, score: number): GameStage | null {
  const stages = getStagesForGame(slug);
  return stages.find((s) => score < s.target) ?? null;
}

export function getStageProgress(slug: string, score: number): number {
  const next = getNextStage(slug, score);
  if (!next) return 100;
  const prev = getCurrentStage(slug, score);
  const range = next.target - prev.target;
  if (range <= 0) return 0;
  return Math.min(100, Math.round(((score - prev.target) / range) * 100));
}
