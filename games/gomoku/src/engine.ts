export type Cell = 0 | 1 | 2;

export interface GomokuState {
  board: Cell[][];
  current: 1 | 2;
  winner: 1 | 2 | null;
  winningCells: Array<[number, number]>;
}

const SIZE = 9;

function empty(): Cell[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0) as Cell[]);
}

export function createInitialState(): GomokuState {
  return { board: empty(), current: 1, winner: null, winningCells: [] };
}

function checkWin(board: Cell[][], row: number, col: number, p: 1 | 2): Array<[number, number]> {
  const dirs: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const cells: Array<[number, number]> = [[row, col]];
    for (const s of [-1, 1] as const) {
      for (let i = 1; i < 5; i++) {
        const r = row + dr * i * s;
        const c = col + dc * i * s;
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE || board[r]![c] !== p) break;
        cells.push([r, c]);
      }
    }
    if (cells.length >= 5) return cells.slice(0, 5);
  }
  return [];
}

export function placeStone(state: GomokuState, row: number, col: number): GomokuState {
  if (state.winner !== null || state.board[row]?.[col] !== 0) return state;
  const board = state.board.map((r) => [...r]);
  board[row]![col] = state.current;
  const win = checkWin(board, row, col, state.current);
  if (win.length >= 5) {
    return { board, current: state.current, winner: state.current, winningCells: win };
  }
  return { board, current: state.current === 1 ? 2 : 1, winner: null, winningCells: [] };
}

export function cpuMove(state: GomokuState): GomokuState {
  if (state.winner !== null || state.current !== 2) return state;
  const candidates: Array<[number, number]> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.board[r]![c] !== 0) continue;
      let near = false;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && state.board[nr]![nc] !== 0) near = true;
        }
      }
      if (near || state.board.flat().every((x) => x === 0)) candidates.push([r, c]);
    }
  }
  if (candidates.length === 0) return state;
  // Block player win
  for (const [r, c] of candidates) {
    const b = state.board.map((row) => [...row]);
    b[r]![c] = 1;
    if (checkWin(b, r, c, 1).length >= 5) return placeStone(state, r, c);
  }
  for (const [r, c] of candidates) {
    const b = state.board.map((row) => [...row]);
    b[r]![c] = 2;
    if (checkWin(b, r, c, 2).length >= 5) return placeStone(state, r, c);
  }
  const [r, c] = candidates[Math.floor(Math.random() * candidates.length)]!;
  return placeStone(state, r, c);
}

export function computeScore(state: GomokuState): number {
  return state.winner === 1 ? 100 : 0;
}
