/** Minesweeper — per-game difficulty (classic ladder, mobile-scaled boards). */

export interface MinesweeperBoardDef {
  rows: number;
  cols: number;
  mines: number;
  label: string;
}

export const MINESWEEPER_BY_DIFFICULTY = {
  EASY: { rows: 9, cols: 9, mines: 10, label: "Beginner 9×9" },
  MEDIUM: { rows: 12, cols: 12, mines: 22, label: "Intermediate 12×12" },
  HARD: { rows: 16, cols: 16, mines: 40, label: "Expert 16×16" },
} as const satisfies Record<string, MinesweeperBoardDef>;

export type MinesweeperDifficulty = keyof typeof MINESWEEPER_BY_DIFFICULTY;

export function getMinesweeperBoard(difficulty: MinesweeperDifficulty): MinesweeperBoardDef {
  return MINESWEEPER_BY_DIFFICULTY[difficulty];
}
