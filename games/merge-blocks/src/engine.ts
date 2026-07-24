export type Cell = number;

export interface MergeBlocksState {
  grid: Cell[][];
  next: number;
  score: number;
  status: "playing" | "over";
}

const ROWS = 6;
const COLS = 4;

function emptyGrid(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export function createInitialState(): MergeBlocksState {
  return { grid: emptyGrid(), next: randomVal(), score: 0, status: "playing" };
}

function randomVal(): number {
  return Math.random() < 0.9 ? 2 : 4;
}

function mergeLine(cells: number[]): { cells: number[]; gained: number } {
  const filtered = cells.filter((c) => c > 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i] === filtered[i + 1]) {
      const v = filtered[i]! * 2;
      out.push(v);
      gained += v;
      i++;
    } else {
      out.push(filtered[i]!);
    }
  }
  while (out.length < COLS) out.unshift(0);
  return { cells: out.slice(-COLS), gained };
}

export function dropColumn(state: MergeBlocksState, col: number): MergeBlocksState {
  if (state.status !== "playing" || col < 0 || col >= COLS) return state;
  const grid = state.grid.map((r) => [...r]);
  let row = ROWS - 1;
  while (row >= 0 && grid[row]![col] !== 0) row--;
  if (row < 0) return { ...state, status: "over" };
  grid[row]![col] = state.next;
  let score = state.score + state.next;
  // merge vertically in column only (simplified merge blocks)
  const colVals = grid.map((r) => r[col]!);
  const merged = mergeLine(colVals);
  let gained = merged.gained;
  for (let r = 0; r < ROWS; r++) {
    grid[r]![col] = merged.cells[r] ?? 0;
  }
  score += gained;
  const full = grid[0]!.every((c) => c !== 0);
  return {
    grid,
    next: randomVal(),
    score,
    status: full ? "over" : "playing",
  };
}
