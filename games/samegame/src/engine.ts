export const ROWS = 10;
export const COLS = 8;

export const COLORS = ["red", "blue", "green", "yellow", "purple"] as const;
export type TileColor = (typeof COLORS)[number];

export const COLOR_HEX: Record<TileColor, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  purple: "#a855f7",
};

export type Cell = TileColor | null;
// board[row][col] -- row 0 is the top; gravity pulls tiles toward higher
// row indices (down), matching how the board visually renders.
export type Board = Cell[][];

export function createRandomBoard(): Board {
  const board: Board = [];
  for (let r = 0; r < ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) {
      row.push(COLORS[Math.floor(Math.random() * COLORS.length)]!);
    }
    board.push(row);
  }
  return board;
}

function findGroup(board: Board, row: number, col: number): [number, number][] {
  const color = board[row]?.[col];
  if (!color) {
    return [];
  }
  const seen = new Set<string>();
  const stack: [number, number][] = [[row, col]];
  const group: [number, number][] = [];

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (seen.has(key) || r < 0 || r >= ROWS || c < 0 || c >= COLS) {
      continue;
    }
    seen.add(key);
    if (board[r]?.[c] !== color) {
      continue;
    }
    group.push([r, c]);
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }

  return group;
}

// Rewards bigger combos superlinearly (2 tiles = 10pts, 5 tiles = 100pts)
// without the "0 points for the minimum clearable group" feel classic
// SameGame's (n-2)^2 formula has.
export function computeGroupScore(size: number): number {
  return size * (size - 1) * 5;
}

// Tiles fall down within their column (gravity), then any fully-emptied
// column collapses and columns to its right shift left to fill the gap --
// the two standard SameGame board-settling rules.
function settleBoard(board: Board): Board {
  const columns: Cell[][] = [];
  for (let c = 0; c < COLS; c++) {
    const filled: Cell[] = [];
    for (let r = 0; r < ROWS; r++) {
      const cell = board[r]?.[c];
      if (cell) {
        filled.push(cell);
      }
    }
    const column: Cell[] = new Array(ROWS - filled.length).fill(null);
    columns.push([...column, ...filled]);
  }

  const nonEmptyColumns = columns.filter((column) =>
    column.some((cell) => cell !== null)
  );
  while (nonEmptyColumns.length < COLS) {
    nonEmptyColumns.push(new Array(ROWS).fill(null));
  }

  const settled: Board = [];
  for (let r = 0; r < ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) {
      row.push(nonEmptyColumns[c]![r]!);
    }
    settled.push(row);
  }
  return settled;
}

export function clearGroup(
  board: Board,
  row: number,
  col: number
): { board: Board; cleared: number } {
  const group = findGroup(board, row, col);
  if (group.length < 2) {
    return { board, cleared: 0 };
  }
  const next = board.map((r) => [...r]);
  for (const [r, c] of group) {
    next[r]![c] = null;
  }
  return { board: settleBoard(next), cleared: group.length };
}

export function hasValidMove(board: Board): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const color = board[r]?.[c];
      if (!color) {
        continue;
      }
      if (board[r]?.[c + 1] === color || board[r + 1]?.[c] === color) {
        return true;
      }
    }
  }
  return false;
}
