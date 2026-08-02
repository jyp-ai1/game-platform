/** Nonogram puzzle ladder — stage = puzzle index. */
export interface NonogramPuzzleDef {
  stageIndex: number;
  size: number;
  solution: boolean[][];
  rowHints: number[][];
  colHints: number[][];
  label: string;
}

const PUZZLE_5: NonogramPuzzleDef = {
  stageIndex: 1,
  size: 5,
  label: "Warm Up",
  solution: [
    [false, true, false, true, false],
    [true, true, true, true, true],
    [false, true, true, true, false],
    [false, true, false, true, false],
    [false, true, false, true, false],
  ],
  rowHints: [[1, 1], [5], [3], [1, 1], [1, 1]],
  colHints: [[1, 1], [5], [3], [1, 1], [1, 1]],
};

const PUZZLE_5_B: NonogramPuzzleDef = {
  stageIndex: 2,
  size: 5,
  label: "Cross",
  solution: [
    [false, false, true, false, false],
    [false, false, true, false, false],
    [true, true, true, true, true],
    [false, false, true, false, false],
    [false, false, true, false, false],
  ],
  rowHints: [[1], [1], [5], [1], [1]],
  colHints: [[1], [1], [5], [1], [1]],
};

const PUZZLE_5_C: NonogramPuzzleDef = {
  stageIndex: 3,
  size: 5,
  label: "Heart",
  solution: [
    [false, true, true, true, false],
    [true, true, true, true, true],
    [true, true, true, true, true],
    [false, true, true, true, false],
    [false, false, true, false, false],
  ],
  rowHints: [[3], [5], [5], [3], [1]],
  colHints: [[2], [4], [5], [4], [2]],
};

export const NONOGRAM_PUZZLES: NonogramPuzzleDef[] = [PUZZLE_5, PUZZLE_5_B, PUZZLE_5_C];
export const FINAL_NONOGRAM_STAGE = NONOGRAM_PUZZLES.length;

export function getNonogramPuzzle(stageIndex: number): NonogramPuzzleDef {
  return NONOGRAM_PUZZLES[Math.min(stageIndex - 1, NONOGRAM_PUZZLES.length - 1)]!;
}
