export type Color = "w" | "b";
export type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
export type Piece = `${Color}${PieceType}`;

export interface Chess960State {
  board: (Piece | null)[][];
  current: Color;
  winner: Color | "draw" | null;
}

const SIZE = 8;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Fischer random back rank: bishops opposite colors, king between rooks. */
function generate960BackRank(color: Color): Piece[] {
  const rank: (Piece | null)[] = Array(8).fill(null);
  const light = [1, 3, 5, 7];
  const dark = [0, 2, 4, 6];
  const b1 = pickRandom(light);
  const b2 = pickRandom(dark);
  rank[b1] = `${color}B` as Piece;
  rank[b2] = `${color}B` as Piece;
  let empty = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => rank[i] === null);
  const qsq = pickRandom(empty);
  rank[qsq] = `${color}Q` as Piece;
  empty = empty.filter((i) => i !== qsq);
  const n1 = pickRandom(empty);
  empty = empty.filter((i) => i !== n1);
  const n2 = pickRandom(empty);
  rank[n1] = `${color}N` as Piece;
  rank[n2] = `${color}N` as Piece;
  empty = empty.filter((i) => i !== n1 && i !== n2).sort((a, b) => a - b);
  rank[empty[0]!] = `${color}R` as Piece;
  rank[empty[1]!] = `${color}K` as Piece;
  rank[empty[2]!] = `${color}R` as Piece;
  return rank as Piece[];
}

function buildStartBoard(): (Piece | null)[][] {
  const wBack = generate960BackRank("w");
  const bBack = generate960BackRank("b");
  const board: (Piece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0]![c] = bBack[c]!;
    board[1]![c] = "bP" as Piece;
    board[6]![c] = "wP" as Piece;
    board[7]![c] = wBack[c]!;
  }
  return board;
}

export function createInitialState(): Chess960State {
  return {
    board: buildStartBoard(),
    current: "w",
    winner: null,
  };
}

export type Move = { from: [number, number]; to: [number, number]; promotion?: PieceType };

function colorOf(p: Piece): Color {
  return p[0] as Color;
}

function typeOf(p: Piece): PieceType {
  return p[1] as PieceType;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function findKing(board: (Piece | null)[][], color: Color): [number, number] {
  const k = `${color}K` as Piece;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r]![c] === k) return [r, c];
    }
  }
  return [-1, -1];
}

const KNIGHT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];
const DIAG_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

function attacked(board: (Piece | null)[][], r: number, c: number, by: Color): boolean {
  const enemy = by;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const p = board[nr]![nc];
      if (p && colorOf(p) === enemy && typeOf(p) === "K") return true;
    }
  }
  for (const dc of [-1, 1]) {
    const nr = r + (enemy === "w" ? -1 : 1);
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const p = board[nr]![nc];
    if (p && colorOf(p) === enemy && typeOf(p) === "P") return true;
  }
  for (const dc of [-1, 1]) {
    for (let nr = r + (enemy === "w" ? -1 : 1); inBounds(nr, c); nr += enemy === "w" ? -1 : 1) {
      const p = board[nr]![c];
      if (p) {
        if (colorOf(p) === enemy && (typeOf(p) === "R" || typeOf(p) === "Q")) return true;
        break;
      }
    }
  }
  for (const dr of [-1, 1]) {
    for (let nc = c + dr; inBounds(r, nc); nc += dr) {
      const p = board[r]![nc];
      if (p) {
        if (colorOf(p) === enemy && (typeOf(p) === "R" || typeOf(p) === "Q")) return true;
        break;
      }
    }
  }
  for (const [dr, dc] of DIAG_DELTAS) {
    for (let i = 1; i < SIZE; i++) {
      const nr = r + dr * i;
      const nc = c + dc * i;
      if (!inBounds(nr, nc)) break;
      const p = board[nr]![nc];
      if (p) {
        if (colorOf(p) === enemy && (typeOf(p) === "B" || typeOf(p) === "Q")) return true;
        break;
      }
    }
  }
  for (const [dr, dc] of KNIGHT_DELTAS) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const p = board[nr]![nc];
    if (p && colorOf(p) === enemy && typeOf(p) === "N") return true;
  }
  return false;
}

function pseudoMoves(board: (Piece | null)[][], r: number, c: number): Move[] {
  const piece = board[r]![c];
  if (!piece) return [];
  const color = colorOf(piece);
  const kind = typeOf(piece);
  const moves: Move[] = [];
  const add = (tr: number, tc: number, promo?: PieceType) => {
    if (!inBounds(tr, tc)) return;
    const target = board[tr]![tc];
    if (target && colorOf(target) === color) return;
    if (kind === "P" && promo) moves.push({ from: [r, c], to: [tr, tc], promotion: promo });
    else moves.push({ from: [r, c], to: [tr, tc] });
  };

  if (kind === "P") {
    const dir = color === "w" ? -1 : 1;
    const start = color === "w" ? 6 : 1;
    const promoRow = color === "w" ? 0 : 7;
    if (!board[r + dir]?.[c]) {
      add(r + dir, c, r + dir === promoRow ? "Q" : undefined);
      if (r === start && !board[r + dir * 2]![c]) add(r + dir * 2, c);
    }
    for (const dc of [-1, 1]) {
      const tr = r + dir;
      const tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr]![tc];
      if (target && colorOf(target) !== color)
        add(tr, tc, tr === promoRow ? "Q" : undefined);
    }
    return moves;
  }

  if (kind === "N") {
    for (const [dr, dc] of KNIGHT_DELTAS) add(r + dr, c + dc);
    return moves;
  }

  const ORTH: Array<[number, number]> = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const DIAG: Array<[number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const KING: Array<[number, number]> = [...ORTH, ...DIAG];

  if (kind === "K") {
    for (const [dr, dc] of KING) add(r + dr, c + dc);
    return moves;
  }

  const slideDirs =
    kind === "R" ? ORTH : kind === "B" ? DIAG : kind === "Q" ? [...ORTH, ...DIAG] : [];

  for (const [dr, dc] of slideDirs) {
    for (let i = 1; i < SIZE; i++) {
      const tr = r + dr * i;
      const tc = c + dc * i;
      if (!inBounds(tr, tc)) break;
      const target = board[tr]![tc];
      if (!target) moves.push({ from: [r, c], to: [tr, tc] });
      else {
        if (colorOf(target) !== color) moves.push({ from: [r, c], to: [tr, tc] });
        break;
      }
    }
  }
  return moves;
}

function apply(board: (Piece | null)[][], move: Move): (Piece | null)[][] {
  const next = board.map((row) => [...row]);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  let piece = next[fr]![fc]!;
  next[fr]![fc] = null;
  if (move.promotion) piece = `${colorOf(piece)}${move.promotion}` as Piece;
  next[tr]![tc] = piece;
  return next;
}

function inCheck(board: (Piece | null)[][], color: Color): boolean {
  const [kr, kc] = findKing(board, color);
  if (kr < 0) return true;
  const enemy: Color = color === "w" ? "b" : "w";
  return attacked(board, kr, kc, enemy);
}

export function getLegalMoves(state: Chess960State, color: Color): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = state.board[r]![c];
      if (!p || colorOf(p) !== color) continue;
      for (const m of pseudoMoves(state.board, r, c)) {
        const board = apply(state.board, m);
        if (!inCheck(board, color)) moves.push(m);
      }
    }
  }
  return moves;
}

export function applyMove(state: Chess960State, move: Move): Chess960State {
  const color = state.current;
  const board = apply(state.board, move);
  const next: Color = color === "w" ? "b" : "w";
  const nextMoves = getLegalMoves({ board, current: next, winner: null }, next);
  const wMoves = getLegalMoves({ board, current: "w", winner: null }, "w");
  const bMoves = getLegalMoves({ board, current: "b", winner: null }, "b");
  let winner: Chess960State["winner"] = null;
  if (wMoves.length === 0 && bMoves.length === 0) winner = "draw";
  else if (nextMoves.length === 0) {
    winner = inCheck(board, next) ? color : "draw";
  }
  return { board, current: winner ? color : next, winner };
}

export function cpuMove(state: Chess960State): Chess960State {
  if (state.winner !== null || state.current !== "b") return state;
  const moves = getLegalMoves(state, "b");
  if (moves.length === 0) return state;
  const captures = moves.filter((m) => state.board[m.to[0]!]![m.to[1]!]);
  const pool = captures.length ? captures : moves;
  return applyMove(state, pool[Math.floor(Math.random() * pool.length)]!);
}

export function computeScore(state: Chess960State): number {
  if (state.winner === "w") return 100;
  if (state.winner === "draw") return 40;
  return 0;
}

export const PIECE_SYMBOL: Record<Piece, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};
