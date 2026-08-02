export const SIZE = 5;

export interface NonogramState {
  solution: boolean[][];
  marks: (boolean | null)[][];
  rowHints: number[][];
  colHints: number[][];
  wrongFlash: [number, number] | null;
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
    wrongFlash: null,
  };
}

export function toggleCell(state: NonogramState, row: number, col: number): NonogramState {
  if (state.status === "won") return state;
  const marks = state.marks.map((r) => [...r]);
  const cur = marks[row]![col];
  if (cur === true) {
    marks[row]![col] = null;
    return { ...state, marks, wrongFlash: null };
  }
  if (!state.solution[row]![col]) {
    return { ...state, wrongFlash: [row, col] };
  }
  marks[row]![col] = true;
  const won = checkWin(state.solution, marks);
  return { ...state, marks, wrongFlash: null, status: won ? "won" : "playing" };
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

export function clearWrongFlash(state: NonogramState): NonogramState {
  return state.wrongFlash ? { ...state, wrongFlash: null } : state;
}

export function formatHint(hints: number[]): string {
  return hints.join(" ");
}
