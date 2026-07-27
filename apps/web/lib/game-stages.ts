/**
 * Universal stage system — auto-generated targets per game profile.
 * Sprint18: per-game overrides with difficulty auto-scaling.
 */
export type StageProfile = "score" | "merge" | "round" | "grid";

export interface GameStage {
  index: number;
  label: string;
  target: number;
}

const MERGE_GAMES = new Set(["2048", "merge-blocks"]);
const GRID_GAMES = new Set(["memory", "sliding-puzzle", "samegame"]);
const ROUND_GAMES = new Set([
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

/** Per-game stage ladders — Sprint18 Epic2. */
const GAME_OVERRIDES: Record<string, GameStage[]> = {
  snake: [
    { index: 1, label: "Stage 1", target: 80 },
    { index: 2, label: "Stage 2", target: 200 },
    { index: 3, label: "Stage 3", target: 350 },
    { index: 4, label: "Stage 4", target: 530 },
    { index: 5, label: "Stage 5", target: 750 },
  ],
  "2048": [
    { index: 1, label: "256", target: 256 },
    { index: 2, label: "512", target: 512 },
    { index: 3, label: "1024", target: 1024 },
    { index: 4, label: "2048", target: 2048 },
    { index: 5, label: "4096", target: 4096 },
  ],
  sudoku: [
    { index: 1, label: "Easy", target: 1 },
    { index: 2, label: "Normal", target: 2 },
    { index: 3, label: "Hard", target: 3 },
    { index: 4, label: "Expert", target: 4 },
    { index: 5, label: "Master", target: 5 },
  ],
  maze: [
    { index: 1, label: "Small", target: 100 },
    { index: 2, label: "Medium", target: 300 },
    { index: 3, label: "Large", target: 600 },
    { index: 4, label: "Complex", target: 1200 },
    { index: 5, label: "Maze Master", target: 2500 },
  ],
  "maze-runner": [
    { index: 1, label: "Small", target: 100 },
    { index: 2, label: "Medium", target: 300 },
    { index: 3, label: "Large", target: 600 },
    { index: 4, label: "Complex", target: 1200 },
    { index: 5, label: "Boss", target: 2500 },
  ],
  memory: [
    { index: 1, label: "2×2", target: 1 },
    { index: 2, label: "3×3", target: 2 },
    { index: 3, label: "4×4", target: 3 },
    { index: 4, label: "5×5", target: 4 },
    { index: 5, label: "Boss", target: 5 },
  ],
  breakout: [
    { index: 1, label: "Stage 1", target: 200 },
    { index: 2, label: "Stage 2", target: 500 },
    { index: 3, label: "Stage 3", target: 1000 },
    { index: 4, label: "Stage 4", target: 2000 },
    { index: 5, label: "Boss", target: 5000 },
  ],
  tetris: [
    { index: 1, label: "Stage 1", target: 500 },
    { index: 2, label: "Stage 2", target: 1500 },
    { index: 3, label: "Stage 3", target: 3000 },
    { index: 4, label: "Stage 4", target: 6000 },
    { index: 5, label: "Boss", target: 10000 },
  ],
  "bubble-shooter": [
    { index: 1, label: "Stage 1", target: 300 },
    { index: 2, label: "Stage 2", target: 800 },
    { index: 3, label: "Stage 3", target: 1500 },
    { index: 4, label: "Stage 4", target: 3000 },
    { index: 5, label: "Boss", target: 6000 },
  ],
};

export function getStageProfile(slug: string): StageProfile {
  if (GAME_OVERRIDES[slug]) return "score";
  if (MERGE_GAMES.has(slug)) return "merge";
  if (GRID_GAMES.has(slug)) return "grid";
  if (ROUND_GAMES.has(slug)) return "round";
  return "score";
}

function defaultScoreStages(): GameStage[] {
  return [
    { index: 1, label: "Stage 1", target: 100 },
    { index: 2, label: "Stage 2", target: 300 },
    { index: 3, label: "Stage 3", target: 600 },
    { index: 4, label: "Stage 4", target: 1200 },
    { index: 5, label: "Boss", target: 2500 },
    { index: 6, label: "Endless", target: 999999 },
  ];
}

function mergeStages(): GameStage[] {
  return [
    { index: 1, label: "256", target: 256 },
    { index: 2, label: "512", target: 512 },
    { index: 3, label: "1024", target: 1024 },
    { index: 4, label: "2048", target: 2048 },
    { index: 5, label: "4096", target: 4096 },
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
  if (GAME_OVERRIDES[slug]) return GAME_OVERRIDES[slug];
  const profile = getStageProfile(slug);
  if (profile === "merge" || profile === "grid") return mergeStages();
  if (profile === "round") return roundStages();
  return defaultScoreStages();
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

export function getStageCount(slug: string): number {
  return getStagesForGame(slug).length;
}
