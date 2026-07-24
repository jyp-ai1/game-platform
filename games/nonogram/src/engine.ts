export const SIZE = 5;

export interface NonogramState {
  solution: boolean[][];
  marks: (boolean | null)[][];
  rowHints: number[][];
  colHints: number[][];
  status: "playing" | "won";
}

// Plus-shaped pattern
const SOLUTION: boolean[][] = [
  [false, true, false, true, false],
  [true, true, true, true, true],
  [false, true, true, true, false],
  [false, true, false, true, false],
  [false, true, false, true, false],
];

const ROW_HINTS = [[1, 1], [5], [3], [1, 1], [1, 1]];
const COL_HINTS = [[1, 1], [5], [3], [1, 1], [1, 1]];

export function createInitialState(): NonogramState {
  return {
    solution: SOLUTION.map((r) => [...r]),
    marks: Array.from({ length: SIZE }, () => Array<boolean | null>(SIZE).fill(null)),
    rowHints: ROW_HINTS,
    colHints: COL_HINTS,
    status: "playing",
  };
}

export function toggleCell(state: NonogramState, row: number, col: number): NonogramState {
  if (state.status === "won") return state;
  const marks = state.marks.map((r) => [...r]);
  const cur = marks[row]![col];
  marks[row]![col] = cur === true ? null : true;
  const won = checkWin(state.solution, marks);
  return { ...state, marks, status: won ? "won" : "playing" };
}

export function markEmpty(state: NonogramState, row: number, col: number): NonogramState {
  if (state.status === "won") return state;
  const marks = state.marks.map((r) => [...r]);
  marks[row]![col] = marks[row]![col] === false ? null : false;
  return { ...state, marks, status: "playing" };
}

function checkWin(solution: boolean[][], marks: (boolean | null)[][]): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const filled = marks[r]![c] === true;
      if (filled !== solution[r]![c]) return false;
    }
  }
  return true;
}

export function computeScore(state: NonogramState): number {
  return state.status === "won" ? 450 : 0;
}

export function formatHint(hints: number[]): string {
  return hints.join(" ");
}
