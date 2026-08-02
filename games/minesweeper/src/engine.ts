export const ROWS = 9;
export const COLS = 9;
export const MINE_COUNT = 10;

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export const MINE_COUNT_BY_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 8,
  MEDIUM: 10,
  HARD: 14,
};

export function mineCountForDifficulty(difficulty: Difficulty): number {
  return MINE_COUNT_BY_DIFFICULTY[difficulty];
}

export interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
}

export type Board = Cell[][];

export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacentMines: 0,
    }))
  );
}

function neighbors(row: number, col: number): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) {
        continue;
      }
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        result.push([r, c]);
      }
    }
  }
  return result;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

// Mines are placed on the first reveal so the very first click is always
// safe (classic minesweeper convention).
export function placeMines(
  board: Board,
  safeRow: number,
  safeCol: number,
  mineCount = MINE_COUNT
): Board {
  const next = cloneBoard(board);
  let placed = 0;
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if ((r === safeRow && c === safeCol) || next[r]![c]!.mine) {
      continue;
    }
    next[r]![c]!.mine = true;
    placed++;
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (next[r]![c]!.mine) {
        continue;
      }
      next[r]![c]!.adjacentMines = neighbors(r, c).filter(
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
      for (const [nr, nc] of neighbors(r, c)) {
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

  const flaggedNeighbors = neighbors(row, col).filter(
    ([r, c]) => board[r]![c]!.flagged
  ).length;
  if (flaggedNeighbors !== cell.adjacentMines) {
    return { board, hitMine: false };
  }

  let next = board;
  for (const [r, c] of neighbors(row, col)) {
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
