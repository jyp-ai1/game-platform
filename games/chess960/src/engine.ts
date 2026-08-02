export type Color = "w" | "b";
export type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
export type Piece = `${Color}${PieceType}`;

export interface Chess960State {
  board: (Piece | null)[][];
  current: Color;
  winner: Color | "draw" | null;
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassant: [number, number] | null;
  /** Initial rook columns on back rank (Fischer castling) */
  rookCols: { w: { h: number; a: number }; b: { h: number; a: number } };
}

const SIZE = 8;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

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

function findRookCols(rank: Piece[]): { h: number; a: number } {
  const cols: number[] = [];
  for (let c = 0; c < 8; c++) {
    if (rank[c]![1] === "R") cols.push(c);
  }
  return { h: Math.max(...cols), a: Math.min(...cols) };
}

function buildStartBoard(): {
  board: (Piece | null)[][];
  rookCols: Chess960State["rookCols"];
} {
  const wBack = generate960BackRank("w");
  const bBack = generate960BackRank("b");
  const board: (Piece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0]![c] = bBack[c]!;
    board[1]![c] = "bP" as Piece;
    board[6]![c] = "wP" as Piece;
    board[7]![c] = wBack[c]!;
  }
  return {
    board,
    rookCols: { w: findRookCols(wBack), b: findRookCols(bBack) },
  };
}

export function createInitialState(): Chess960State {
  const { board, rookCols } = buildStartBoard();
  return {
    board,
    current: "w",
    winner: null,
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    rookCols,
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

function inCheck(board: (Piece | null)[][], color: Color): boolean {
  const [kr, kc] = findKing(board, color);
  if (kr < 0) return true;
  return attacked(board, kr, kc, color === "w" ? "b" : "w");
}

function castlingMoves960(board: (Piece | null)[][], color: Color, state: Chess960State): Move[] {
  const row = color === "w" ? 7 : 0;
  const [kr, kc] = findKing(board, color);
  if (kr !== row) return [];
  if (inCheck(board, color)) return [];

  const enemy = color === "w" ? "b" : "w";
  const moves: Move[] = [];
  const kingDestK = 6;
  const kingDestQ = 2;
  const rookDestK = 5;
  const rookDestQ = 3;

  const trySide = (side: "K" | "Q") => {
    const allowed =
      color === "w"
        ? side === "K"
          ? state.castling.wK
          : state.castling.wQ
        : side === "K"
          ? state.castling.bK
          : state.castling.bQ;
    if (!allowed) return;

    const rookCol = side === "K" ? state.rookCols[color === "w" ? "w" : "b"].h : state.rookCols[color === "w" ? "w" : "b"].a;
    const kingDest = side === "K" ? kingDestK : kingDestQ;
    const between =
      kc < rookCol
        ? Array.from({ length: rookCol - kc - 1 }, (_, i) => kc + 1 + i)
        : Array.from({ length: kc - rookCol - 1 }, (_, i) => rookCol + 1 + i);

    for (const c of between) {
      if (board[row]![c]) return;
    }

    const passCols =
      kc < kingDest
        ? Array.from({ length: kingDest - kc }, (_, i) => kc + 1 + i)
        : Array.from({ length: kc - kingDest }, (_, i) => kingDest + i);
    for (const c of passCols) {
      if (attacked(board, row, c, enemy)) return;
    }

    moves.push({ from: [row, kc], to: [row, kingDest] });
  };

  trySide("K");
  trySide("Q");
  return moves;
}

function pseudoMoves(board: (Piece | null)[][], r: number, c: number, state: Chess960State): Move[] {
  const piece = board[r]![c];
  if (!piece) return [];
  const color = colorOf(piece);
  const kind = typeOf(piece);
  const moves: Move[] = [];
  const promoTypes: PieceType[] = ["Q", "R", "B", "N"];

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
      if (r + dir === promoRow) {
        for (const pt of promoTypes) add(r + dir, c, pt);
      } else {
        add(r + dir, c);
        if (r === start && !board[r + dir * 2]![c]) add(r + dir * 2, c);
      }
    }
    for (const dc of [-1, 1]) {
      const tr = r + dir;
      const tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr]![tc];
      if (target && colorOf(target) !== color) {
        if (tr === promoRow) {
          for (const pt of promoTypes) add(tr, tc, pt);
        } else {
          add(tr, tc);
        }
      }
      if (state.enPassant && state.enPassant[0] === tr && state.enPassant[1] === tc && !target) {
        add(tr, tc);
      }
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
    moves.push(...castlingMoves960(board, color, state));
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

function apply(board: (Piece | null)[][], move: Move, state: Chess960State): (Piece | null)[][] {
  const next = board.map((row) => [...row]);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  let piece = next[fr]![fc]!;
  const movingColor = colorOf(piece);
  next[fr]![fc] = null;

  if (typeOf(piece) === "K" && Math.abs(tc - fc) >= 2) {
    const side = tc > fc ? "K" : "Q";
    const row = fr;
    const rookCol =
      side === "K"
        ? state.rookCols[movingColor === "w" ? "w" : "b"].h
        : state.rookCols[movingColor === "w" ? "w" : "b"].a;
    const rookDest = side === "K" ? 5 : 3;
    const rook = next[row]![rookCol] ?? null;
    next[row]![rookDest] = rook;
    next[row]![rookCol] = null;
  }

  if (typeOf(piece) === "P" && fc !== tc && !next[tr]![tc]) {
    next[fr]![tc] = null;
  }

  if (move.promotion) piece = `${movingColor}${move.promotion}` as Piece;
  next[tr]![tc] = piece;
  return next;
}

function updateCastling(
  castling: Chess960State["castling"],
  board: (Piece | null)[][],
  move: Move,
  state: Chess960State
): Chess960State["castling"] {
  const next = { ...castling };
  const [fr, fc] = move.from;
  const [tr] = move.to;
  const piece = board[fr]![fc];
  if (!piece) return next;
  const color = colorOf(piece);
  if (typeOf(piece) === "K") {
    if (color === "w") {
      next.wK = false;
      next.wQ = false;
    } else {
      next.bK = false;
      next.bQ = false;
    }
  }
  if (typeOf(piece) === "R") {
    const cols = state.rookCols[color === "w" ? "w" : "b"];
    if (fc === cols.h) {
      if (color === "w") next.wK = false;
      else next.bK = false;
    }
    if (fc === cols.a) {
      if (color === "w") next.wQ = false;
      else next.bQ = false;
    }
  }
  if (board[tr]?.[fc] && typeOf(board[tr]![fc]!) === "R") {
    const cols = state.rookCols[color === "w" ? "w" : "b"];
    if (fc === cols.h) {
      if (color === "w") next.wK = false;
      else next.bK = false;
    }
    if (fc === cols.a) {
      if (color === "w") next.wQ = false;
      else next.bQ = false;
    }
  }
  return next;
}

function nextEnPassant(board: (Piece | null)[][], move: Move): [number, number] | null {
  const [fr, fc] = move.from;
  const [tr] = move.to;
  const piece = board[fr]![fc];
  if (!piece || typeOf(piece) !== "P") return null;
  if (Math.abs(tr - fr) === 2) return [(fr + tr) / 2, fc];
  return null;
}

export function getLegalMoves(state: Chess960State, color: Color): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = state.board[r]![c];
      if (!p || colorOf(p) !== color) continue;
      for (const m of pseudoMoves(state.board, r, c, state)) {
        const board = apply(state.board, m, state);
        if (!inCheck(board, color)) moves.push(m);
      }
    }
  }
  return moves;
}

export function applyMove(state: Chess960State, move: Move): Chess960State {
  const color = state.current;
  const castling = updateCastling(state.castling, state.board, move, state);
  const enPassant = nextEnPassant(state.board, move);
  const board = apply(state.board, move, state);
  const next: Color = color === "w" ? "b" : "w";
  const nextMoves = getLegalMoves(
    { ...state, board, current: next, winner: null, castling, enPassant: null },
    next
  );
  const wMoves = getLegalMoves(
    { ...state, board, current: "w", winner: null, castling, enPassant: null },
    "w"
  );
  const bMoves = getLegalMoves(
    { ...state, board, current: "b", winner: null, castling, enPassant: null },
    "b"
  );
  let winner: Chess960State["winner"] = null;
  if (wMoves.length === 0 && bMoves.length === 0) winner = "draw";
  else if (nextMoves.length === 0) {
    winner = inCheck(board, next) ? color : "draw";
  }
  return {
    ...state,
    board,
    current: winner ? color : next,
    winner,
    castling,
    enPassant: winner ? null : enPassant,
  };
}

export function cpuMove(
  state: Chess960State,
  difficulty: "easy" | "normal" | "hard" = "normal"
): Chess960State {
  if (state.winner !== null || state.current !== "b") return state;
  const moves = getLegalMoves(state, "b");
  if (moves.length === 0) return state;

  if (difficulty === "easy") {
    return applyMove(state, moves[Math.floor(Math.random() * moves.length)]!);
  }

  if (difficulty === "hard") {
    let best = moves[0]!;
    let bestScore = -Infinity;
    for (const move of moves) {
      const after = applyMove(state, move);
      const opponentMoves = getLegalMoves(after, "w").length;
      const captured = state.board[move.to[0]!]![move.to[1]!] ? 12 : 0;
      const score = captured - opponentMoves;
      if (score > bestScore) {
        bestScore = score;
        best = move;
      }
    }
    return applyMove(state, best);
  }

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

export const PROMOTION_PIECES: PieceType[] = ["Q", "R", "B", "N"];
