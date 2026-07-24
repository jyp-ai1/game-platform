export type Piece = 0 | 1 | 2 | 3 | 4; // 0 empty, 1 man, 2 king, 3 cpu man, 4 cpu king

export interface CheckersState {
  board: Piece[][];
  current: 1 | 2;
  winner: 1 | 2 | "draw" | null;
  mustContinue: [number, number] | null;
}

const SIZE = 8;

function isDark(r: number, c: number): boolean {
  return (r + c) % 2 === 1;
}

function isHuman(p: Piece): boolean {
  return p === 1 || p === 2;
}

function isCpu(p: Piece): boolean {
  return p === 3 || p === 4;
}

function owner(p: Piece): 1 | 2 | null {
  if (isHuman(p)) return 1;
  if (isCpu(p)) return 2;
  return null;
}

function isKing(p: Piece): boolean {
  return p === 2 || p === 4;
}

export function createInitialState(): CheckersState {
  const board: Piece[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(0) as Piece[]);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isDark(r, c)) continue;
      if (r < 3) board[r]![c] = 3;
      if (r > 4) board[r]![c] = 1;
    }
  }
  return { board, current: 1, winner: null, mustContinue: null };
}

type Move = { from: [number, number]; to: [number, number]; captured?: [number, number] };

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function dirs(p: Piece): number[] {
  if (p === 1) return [1];
  if (p === 3) return [-1];
  return [-1, 1];
}

function getJumps(state: CheckersState, r: number, c: number, player: 1 | 2): Move[] {
  const p = state.board[r]![c]!;
  if (owner(p) !== player) return [];
  const moves: Move[] = [];
  for (const dr of dirs(p)) {
    for (const dc of [-1, 1]) {
      const mr = r + dr;
      const mc = c + dc;
      const jr = r + dr * 2;
      const jc = c + dc * 2;
      if (!inBounds(jr, jc) || !isDark(jr, jc)) continue;
      const mid = state.board[mr]?.[mc];
      if (!mid || owner(mid!) === player) continue;
      if (state.board[jr]![jc] !== 0) continue;
      moves.push({ from: [r, c], to: [jr, jc], captured: [mr, mc] });
    }
  }
  return moves;
}

function getSteps(state: CheckersState, r: number, c: number, player: 1 | 2): Move[] {
  const p = state.board[r]![c]!;
  if (owner(p) !== player || isKing(p)) return [];
  const moves: Move[] = [];
  for (const dr of dirs(p)) {
    for (const dc of [-1, 1]) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc) || !isDark(nr, nc)) continue;
      if (state.board[nr]![nc] === 0) moves.push({ from: [r, c], to: [nr, nc] });
    }
  }
  return moves;
}

function getKingSteps(state: CheckersState, r: number, c: number, player: 1 | 2): Move[] {
  const p = state.board[r]![c]!;
  if (owner(p) !== player || !isKing(p)) return [];
  const moves: Move[] = [];
  for (const dr of [-1, 1]) {
    for (const dc of [-1, 1]) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc) || !isDark(nr, nc)) continue;
      if (state.board[nr]![nc] === 0) moves.push({ from: [r, c], to: [nr, nc] });
    }
  }
  return moves;
}

export function getLegalMoves(state: CheckersState, player: 1 | 2): Move[] {
  if (state.winner !== null) return [];
  if (state.mustContinue) {
    const [r, c] = state.mustContinue;
    return getJumps(state, r, c, player);
  }
  const jumps: Move[] = [];
  const steps: Move[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      jumps.push(...getJumps(state, r, c, player));
      steps.push(...getSteps(state, r, c, player), ...getKingSteps(state, r, c, player));
    }
  }
  return jumps.length > 0 ? jumps : steps;
}

function promote(p: Piece, r: number): Piece {
  if (p === 1 && r === 0) return 2;
  if (p === 3 && r === SIZE - 1) return 4;
  return p;
}

export function applyMove(state: CheckersState, move: Move): CheckersState {
  const player = state.current;
  const board = state.board.map((row) => [...row]);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  let piece = board[fr]![fc]!;
  board[fr]![fc] = 0;
  if (move.captured) {
    const [cr, cc] = move.captured;
    board[cr]![cc] = 0;
  }
  piece = promote(piece, tr);
  board[tr]![tc] = piece;

  if (move.captured) {
    const more = getJumps({ ...state, board, mustContinue: null }, tr, tc, player);
    if (more.length > 0) {
      return { board, current: player, winner: null, mustContinue: [tr, tc] };
    }
  }

  const next: 1 | 2 = player === 1 ? 2 : 1;
  const nextMoves = getLegalMoves({ board, current: next, winner: null, mustContinue: null }, next);
  const humanMoves = getLegalMoves({ board, current: 1, winner: null, mustContinue: null }, 1);
  const cpuMoves = getLegalMoves({ board, current: 2, winner: null, mustContinue: null }, 2);
  let winner: CheckersState["winner"] = null;
  if (humanMoves.length === 0 && cpuMoves.length === 0) winner = "draw";
  else if (humanMoves.length === 0) winner = 2;
  else if (cpuMoves.length === 0) winner = 1;

  return { board, current: winner ? player : next, winner, mustContinue: null };
}

export function cpuMove(state: CheckersState): CheckersState {
  if (state.winner !== null || state.current !== 2) return state;
  const moves = getLegalMoves(state, 2);
  if (moves.length === 0) return state;
  const captures = moves.filter((m) => m.captured);
  const pick = (captures.length ? captures : moves)[Math.floor(Math.random() * (captures.length || moves.length))]!;
  return applyMove(state, pick);
}

export function computeScore(state: CheckersState): number {
  if (state.winner === 1) return 100;
  if (state.winner === "draw") return 40;
  return 0;
}
