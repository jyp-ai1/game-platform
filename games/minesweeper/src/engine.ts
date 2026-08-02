import { getMinesweeperBoard, type MinesweeperDifficulty } from "./minesweeper-stage-config";

export type Difficulty = MinesweeperDifficulty;

export interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
}

export type Board = Cell[][];

export function boardRows(board: Board): number {
  return board.length;
}

export function boardCols(board: Board): number {
  return board[0]?.length ?? 0;
}

/** @deprecated use getMinesweeperBoard(difficulty).mines */
export const MINE_COUNT = 10;

/** @deprecated use board dimensions from state */
export const ROWS = 9;
/** @deprecated use board dimensions from state */
export const COLS = 9;

export function mineCountForDifficulty(difficulty: Difficulty): number {
  return getMinesweeperBoard(difficulty).mines;
}

export function createEmptyBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacentMines: 0,
    }))
  );
}

function neighbors(board: Board, row: number, col: number): Array<[number, number]> {
  const rows = boardRows(board);
  const cols = boardCols(board);
  const result: Array<[number, number]> = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) {
        continue;
      }
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        result.push([r, c]);
      }
    }
  }
  return result;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function placeMines(
  board: Board,
  safeRow: number,
  safeCol: number,
  mineCount: number
): Board {
  const rows = boardRows(board);
  const cols = boardCols(board);
  const next = cloneBoard(board);
  let placed = 0;
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if ((r === safeRow && c === safeCol) || next[r]![c]!.mine) {
      continue;
    }
    next[r]![c]!.mine = true;
    placed++;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r]![c]!.mine) {
        continue;
      }
      next[r]![c]!.adjacentMines = neighbors(next, r, c).filter(
        ([nr, nc]) => next[nr]![nc]!.mine
      ).length;
    }
  }
  return next;
}

export function reveal(board: Board, row: number, col: number): Board {
  const next = cloneBoard(board);
  const stack: Array<[number, number]> = [[row, col]];
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const cell = next[r]![c]!;
    if (cell.revealed || cell.flagged) {
      continue;
    }
    cell.revealed = true;
    if (cell.adjacentMines === 0 && !cell.mine) {
      for (const [nr, nc] of neighbors(next, r, c)) {
        if (!next[nr]![nc]!.revealed) {
          stack.push([nr, nc]);
        }
      }
    }
  }
  return next;
}

export function toggleFlag(board: Board, row: number, col: number): Board {
  const next = cloneBoard(board);
  const cell = next[row]![col]!;
  if (!cell.revealed) {
    cell.flagged = !cell.flagged;
  }
  return next;
}

export function revealAllMines(board: Board): Board {
  return board.map((row) =>
    row.map((cell) => (cell.mine ? { ...cell, revealed: true } : cell))
  );
}

export function checkWin(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell.mine || cell.revealed));
}

/** Classic chord: click a revealed number when adjacent flags match its count. */
export function chordReveal(
  board: Board,
  row: number,
  col: number
): { board: Board; hitMine: boolean } {
  const cell = board[row]?.[col];
  if (!cell?.revealed || cell.adjacentMines === 0) {
    return { board, hitMine: false };
  }

  const flaggedNeighbors = neighbors(board, row, col).filter(
    ([r, c]) => board[r]![c]!.flagged
  ).length;
  if (flaggedNeighbors !== cell.adjacentMines) {
    return { board, hitMine: false };
  }

  let next = board;
  for (const [r, c] of neighbors(board, row, col)) {
    const neighbor = next[r]![c]!;
    if (neighbor.revealed || neighbor.flagged) {
      continue;
    }
    if (neighbor.mine) {
      return { board: revealAllMines(next), hitMine: true };
    }
    next = reveal(next, r, c);
  }

  return { board: next, hitMine: false };
}
