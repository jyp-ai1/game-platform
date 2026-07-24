export type Cell = 0 | 1 | 2; // 0 empty, 1 player, 2 cpu

export interface Connect4State {
  board: Cell[][]; // [row][col], row 0 = top
  current: 1 | 2;
  winner: 1 | 2 | "draw" | null;
  winningCells: Array<[number, number]>;
}

const ROWS = 6;
const COLS = 7;

function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);
}

export function createInitialState(): Connect4State {
  return { board: emptyBoard(), current: 1, winner: null, winningCells: [] };
}

function dropRow(board: Cell[][], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r]![col] === 0) return r;
  }
  return -1;
}

function checkWin(
  board: Cell[][],
  row: number,
  col: number,
  player: 1 | 2
): Array<[number, number]> {
  const dirs: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of dirs) {
    const cells: Array<[number, number]> = [[row, col]];
    for (const sign of [-1, 1] as const) {
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i * sign;
        const c = col + dc * i * sign;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r]![c] !== player) break;
        cells.push([r, c]);
      }
    }
    if (cells.length >= 4) return cells.slice(0, 4);
  }
  return [];
}

function boardFull(board: Cell[][]): boolean {
  return board[0]!.every((c) => c !== 0);
}

export function dropDisc(state: Connect4State, col: number): Connect4State {
  if (state.winner !== null || col < 0 || col >= COLS) return state;
  const row = dropRow(state.board, col);
  if (row < 0) return state;
  const board = state.board.map((r) => [...r]);
  board[row]![col] = state.current;
  const win = checkWin(board, row, col, state.current);
  if (win.length >= 4) {
    return { board, current: state.current, winner: state.current, winningCells: win };
  }
  if (boardFull(board)) {
    return { board, current: state.current, winner: "draw", winningCells: [] };
  }
  return {
    board,
    current: state.current === 1 ? 2 : 1,
    winner: null,
    winningCells: [],
  };
}

function wouldWin(board: Cell[][], col: number, player: 1 | 2): boolean {
  const row = dropRow(board, col);
  if (row < 0) return false;
  const next = board.map((r) => [...r]);
  next[row]![col] = player;
  return checkWin(next, row, col, player).length >= 4;
}

export function cpuMove(state: Connect4State): Connect4State {
  if (state.winner !== null || state.current !== 2) return state;
  const cols = Array.from({ length: COLS }, (_, i) => i).filter(
    (c) => dropRow(state.board, c) >= 0
  );
  if (cols.length === 0) return state;
  for (const c of cols) {
    if (wouldWin(state.board, c, 2)) return dropDisc(state, c);
  }
  for (const c of cols) {
    if (wouldWin(state.board, c, 1)) return dropDisc(state, c);
  }
  const center = cols.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
  return dropDisc(state, center[0]!);
}

export function computeScore(state: Connect4State): number {
  if (state.winner === 1) return 100;
  if (state.winner === "draw") return 25;
  return 0;
}
