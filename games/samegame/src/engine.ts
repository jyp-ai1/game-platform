import {
  type SameGameDifficulty,
  boardSizeForDifficulty,
} from "./samegame-stage-config";

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
export type Board = Cell[][];

export interface SameGameState {
  board: Board;
  score: number;
  status: "playing" | "over" | "won";
  difficulty: SameGameDifficulty;
  rows: number;
  cols: number;
}

export function createRandomBoard(rows: number, cols: number): Board {
  const board: Board = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(COLORS[Math.floor(Math.random() * COLORS.length)]!);
    }
    board.push(row);
  }
  return board;
}

function findGroup(board: Board, row: number, col: number, rows: number, cols: number): [number, number][] {
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
    if (seen.has(key) || r < 0 || r >= rows || c < 0 || c >= cols) {
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

/** Classic SameGame scoring: (n − 2)² for groups of 2+ matching tiles. */
export function computeGroupScore(size: number): number {
  if (size < 2) return 0;
  const n = size - 2;
  return n * n;
}

/** Bonus for clearing every tile (classic SameGame board-clear reward). */
export const BOARD_CLEAR_BONUS = 2000;

function settleBoard(board: Board, rows: number, cols: number): Board {
  const columns: Cell[][] = [];
  for (let c = 0; c < cols; c++) {
    const filled: Cell[] = [];
    for (let r = 0; r < rows; r++) {
      const cell = board[r]?.[c];
      if (cell) {
        filled.push(cell);
      }
    }
    const column: Cell[] = new Array(rows - filled.length).fill(null);
    columns.push([...column, ...filled]);
  }

  const nonEmptyColumns = columns.filter((column) =>
    column.some((cell) => cell !== null)
  );
  while (nonEmptyColumns.length < cols) {
    nonEmptyColumns.push(new Array(rows).fill(null));
  }

  const settled: Board = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(nonEmptyColumns[c]![r]!);
    }
    settled.push(row);
  }
  return settled;
}

export function clearGroup(
  board: Board,
  row: number,
  col: number,
  rows: number,
  cols: number
): { board: Board; cleared: number } {
  const group = findGroup(board, row, col, rows, cols);
  if (group.length < 2) {
    return { board, cleared: 0 };
  }
  const next = board.map((r) => [...r]);
  for (const [r, c] of group) {
    next[r]![c] = null;
  }
  return { board: settleBoard(next, rows, cols), cleared: group.length };
}

export function hasValidMove(board: Board, rows: number, cols: number): boolean {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
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

export function isBoardEmpty(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell === null));
}

export function createInitialState(difficulty: SameGameDifficulty = "MEDIUM"): SameGameState {
  const { rows, cols } = boardSizeForDifficulty(difficulty);
  let board = createRandomBoard(rows, cols);
  while (!hasValidMove(board, rows, cols)) {
    board = createRandomBoard(rows, cols);
  }
  return { board, score: 0, status: "playing", difficulty, rows, cols };
}

export type { SameGameDifficulty };
