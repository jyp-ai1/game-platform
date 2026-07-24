export type Cell = 0 | 1 | 2; // 0 empty, 1 black (player), 2 white (cpu)

export interface ReversiState {
  board: Cell[][];
  current: 1 | 2;
  winner: 1 | 2 | "draw" | null;
  passStreak: number;
}

const SIZE = 8;

function empty(): Cell[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0) as Cell[]);
}

export function createInitialState(): ReversiState {
  const board = empty();
  board[3]![3] = 2;
  board[3]![4] = 1;
  board[4]![3] = 1;
  board[4]![4] = 2;
  return { board, current: 1, winner: null, passStreak: 0 };
}

const DIRS: Array<[number, number]> = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
];

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function flipsIf(board: Cell[][], r: number, c: number, player: 1 | 2): Array<[number, number]> {
  if (board[r]![c] !== 0) return [];
  const opp = player === 1 ? 2 : 1;
  const all: Array<[number, number]> = [];
  for (const [dr, dc] of DIRS) {
    const line: Array<[number, number]> = [];
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc) && board[nr]![nc] === opp) {
      line.push([nr, nc]);
      nr += dr;
      nc += dc;
    }
    if (line.length > 0 && inBounds(nr, nc) && board[nr]![nc] === player) {
      all.push(...line, [r, c]);
    }
  }
  return all.length > 0 ? all : [];
}

export function validMoves(board: Cell[][], player: 1 | 2): Array<[number, number]> {
  const moves: Array<[number, number]> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (flipsIf(board, r, c, player).length > 0) moves.push([r, c]);
    }
  }
  return moves;
}

function count(board: Cell[][], player: 1 | 2): number {
  return board.flat().filter((x) => x === player).length;
}

function endGame(board: Cell[][]): 1 | 2 | "draw" {
  const b = count(board, 1);
  const w = count(board, 2);
  if (b > w) return 1;
  if (w > b) return 2;
  return "draw";
}

export function placeDisc(state: ReversiState, row: number, col: number): ReversiState {
  if (state.winner !== null) return state;
  const flips = flipsIf(state.board, row, col, state.current);
  if (flips.length === 0) return state;
  const board = state.board.map((r) => [...r]);
  board[row]![col] = state.current;
  for (const [r, c] of flips) {
    if (r === row && c === col) continue;
    board[r]![c] = state.current;
  }
  return advance({ ...state, board, passStreak: 0 });
}

function advance(state: ReversiState): ReversiState {
  const next = state.current === 1 ? 2 : 1;
  if (validMoves(state.board, next).length > 0) {
    return { ...state, current: next, passStreak: 0 };
  }
  if (validMoves(state.board, state.current).length > 0) {
    return { ...state, passStreak: state.passStreak + 1 };
  }
  return { ...state, winner: endGame(state.board), passStreak: 0 };
}

export function cpuMove(state: ReversiState): ReversiState {
  if (state.winner !== null || state.current !== 2) return state;
  const moves = validMoves(state.board, 2);
  if (moves.length === 0) return advance(state);
  let best = moves[0]!;
  let bestFlips = 0;
  for (const [r, c] of moves) {
    const n = flipsIf(state.board, r, c, 2).length;
    if (n > bestFlips) {
      bestFlips = n;
      best = [r, c];
    }
  }
  return placeDisc(state, best[0], best[1]);
}

export function computeScore(state: ReversiState): number {
  if (state.winner === 1) return count(state.board, 1) * 2;
  if (state.winner === "draw") return 50;
  return count(state.board, 1);
}
