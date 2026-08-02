import { getNonogramPuzzle, type NonogramPuzzleDef } from "./nonogram-stage-config";

export interface NonogramState {
  solution: boolean[][];
  marks: (boolean | null)[][];
  rowHints: number[][];
  colHints: number[][];
  wrongFlash: [number, number] | null;
  status: "playing" | "won" | "stage-clear";
  stageIndex: number;
  puzzle: NonogramPuzzleDef;
}

export function puzzleSize(state: NonogramState): number {
  return state.puzzle.size;
}

export function createInitialState(stageIndex = 1): NonogramState {
  const puzzle = getNonogramPuzzle(stageIndex);
  const size = puzzle.size;
  return {
    solution: puzzle.solution.map((r) => [...r]),
    marks: Array.from({ length: size }, () => Array<boolean | null>(size).fill(null)),
    rowHints: puzzle.rowHints,
    colHints: puzzle.colHints,
    status: "playing",
    wrongFlash: null,
    stageIndex,
    puzzle,
  };
}

export function toggleCell(state: NonogramState, row: number, col: number): NonogramState {
  if (state.status !== "playing") return state;
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
  return {
    ...state,
    marks,
    wrongFlash: null,
    status: won ? "stage-clear" : "playing",
  };
}

export function markEmpty(state: NonogramState, row: number, col: number): NonogramState {
  if (state.status !== "playing") return state;
  const marks = state.marks.map((r) => [...r]);
  marks[row]![col] = marks[row]![col] === false ? null : false;
  return { ...state, marks, status: "playing" };
}

function checkWin(solution: boolean[][], marks: (boolean | null)[][]): boolean {
  const size = solution.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const filled = marks[r]![c] === true;
      if (filled !== solution[r]![c]) return false;
    }
  }
  return true;
}

export function computeScore(state: NonogramState): number {
  const base = state.stageIndex * 150;
  return state.status === "won" || state.status === "stage-clear" ? base + 300 : 0;
}

export function clearWrongFlash(state: NonogramState): NonogramState {
  return state.wrongFlash ? { ...state, wrongFlash: null } : state;
}

export function formatHint(hints: number[]): string {
  return hints.join(" ");
}
