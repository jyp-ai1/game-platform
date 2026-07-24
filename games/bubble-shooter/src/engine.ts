export type ColorId = 1 | 2 | 3;

export interface BubbleShooterState {
  grid: (ColorId | 0)[][];
  next: ColorId;
  score: number;
  shots: number;
  status: "playing" | "over" | "won";
}

const ROWS = 9;
const COLS = 7;
const INITIAL_ROWS = 4;
const MAX_SHOTS = 40;

function emptyGrid(): (ColorId | 0)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as (ColorId | 0)[]);
}

function randomColor(): ColorId {
  return (Math.floor(Math.random() * 3) + 1) as ColorId;
}

export function createInitialState(): BubbleShooterState {
  const grid = emptyGrid();
  for (let r = 0; r < INITIAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      grid[r]![c] = randomColor();
    }
  }
  return { grid, next: randomColor(), score: 0, shots: 0, status: "playing" };
}

function flood(
  grid: (ColorId | 0)[][],
  row: number,
  col: number,
  color: ColorId
): Array<[number, number]> {
  const seen = new Set<string>();
  const stack: Array<[number, number]> = [[row, col]];
  const out: Array<[number, number]> = [];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (grid[r]?.[c] !== color) continue;
    out.push([r, c]);
    for (const [nr, nc] of [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ] as const) {
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) stack.push([nr, nc]);
    }
  }
  return out;
}

function isEmpty(grid: (ColorId | 0)[][]): boolean {
  return grid.every((row) => row.every((c) => c === 0));
}

function bottomReached(grid: (ColorId | 0)[][]): boolean {
  return grid[ROWS - 1]!.some((c) => c !== 0);
}

export function shootColumn(state: BubbleShooterState, col: number): BubbleShooterState {
  if (state.status !== "playing" || col < 0 || col >= COLS) return state;
  const grid = state.grid.map((r) => [...r]);
  let landRow = ROWS - 1;
  while (landRow >= 0 && grid[landRow]![col] !== 0) landRow--;
  if (landRow < 0) return { ...state, status: "over" };

  grid[landRow]![col] = state.next;
  let score = state.score + 5;
  const group = flood(grid, landRow, col, state.next);
  if (group.length >= 3) {
    for (const [r, c] of group) grid[r]![c] = 0;
    score += group.length * 15;
  }

  const shots = state.shots + 1;
  let status: BubbleShooterState["status"] = "playing";
  if (isEmpty(grid)) status = "won";
  else if (bottomReached(grid) || shots >= MAX_SHOTS) status = "over";

  return { grid, next: randomColor(), score, shots, status };
}

export function computeScore(score: number, status: BubbleShooterState["status"]): number {
  if (status === "won") return score + 200;
  return score;
}
