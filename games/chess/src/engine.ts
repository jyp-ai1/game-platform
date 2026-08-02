export type Color = "w" | "b";
export type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
export type Piece = `${Color}${PieceType}`;

export interface ChessState {
  board: (Piece | null)[][];
  current: Color;
  winner: Color | "draw" | null;
  /** Kingside / queenside castling still available */
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  /** Square behind a pawn that just advanced two ranks (en passant target) */
  enPassant: [number, number] | null;
}

const SIZE = 8;

const START: (Piece | null)[][] = [
  ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
  ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
  ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
];

export function createInitialState(): ChessState {
  return {
    board: START.map((r) => [...r]),
    current: "w",
    winner: null,
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
  };
}

export type Move = {
  from: [number, number];
  to: [number, number];
  promotion?: PieceType;
};

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

function castlingMoves(
  board: (Piece | null)[][],
  color: Color,
  castling: ChessState["castling"]
): Move[] {
  const row = color === "w" ? 7 : 0;
  const [kr, kc] = findKing(board, color);
  if (kr !== row || kc !== 4) return [];
  if (inCheck(board, color)) return [];

  const moves: Move[] = [];
  const tryCastle = (side: "K" | "Q") => {
    const allowed =
      color === "w"
        ? side === "K"
          ? castling.wK
          : castling.wQ
        : side === "K"
          ? castling.bK
          : castling.bQ;
    if (!allowed) return;

    const rookCol = side === "K" ? 7 : 0;
    const passCols = side === "K" ? [5, 6] : [1, 2, 3];
    const destCol = side === "K" ? 6 : 2;
    const rook = board[row]![rookCol];
    if (!rook || colorOf(rook) !== color || typeOf(rook) !== "R") return;
    for (let c = kc + (side === "K" ? 1 : -1); side === "K" ? c < rookCol : c > rookCol; c += side === "K" ? 1 : -1) {
      if (board[row]![c]) return;
    }
    for (const c of passCols) {
      if (attacked(board, row, c, color === "w" ? "b" : "w")) return;
    }
    moves.push({ from: [row, 4], to: [row, destCol] });
  };

  tryCastle("K");
  tryCastle("Q");
  return moves;
}

function pseudoMoves(board: (Piece | null)[][], r: number, c: number, state: ChessState): Move[] {
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
      if (
        state.enPassant &&
        state.enPassant[0] === tr &&
        state.enPassant[1] === tc &&
        !target
      ) {
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
    moves.push(...castlingMoves(board, color, state.castling));
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

function apply(board: (Piece | null)[][], move: Move, state: ChessState): (Piece | null)[][] {
  const next = board.map((row) => [...row]);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  let piece = next[fr]![fc]!;
  const movingColor = colorOf(piece);
  next[fr]![fc] = null;

  if (typeOf(piece) === "K" && Math.abs(tc - fc) === 2) {
    const side = tc > fc ? "K" : "Q";
    const row = fr;
    const rookFrom = side === "K" ? 7 : 0;
    const rookTo = side === "K" ? 5 : 3;
    const rook = next[row]![rookFrom] ?? null;
    next[row]![rookTo] = rook;
    next[row]![rookFrom] = null;
  }

  if (typeOf(piece) === "P" && fc !== tc && !next[tr]![tc]) {
    next[fr]![tc] = null;
  }

  if (move.promotion) piece = `${movingColor}${move.promotion}` as Piece;
  next[tr]![tc] = piece;
  return next;
}

function updateCastling(
  castling: ChessState["castling"],
  board: (Piece | null)[][],
  move: Move
): ChessState["castling"] {
  const next = { ...castling };
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
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
    if (color === "w" && fr === 7 && fc === 0) next.wQ = false;
    if (color === "w" && fr === 7 && fc === 7) next.wK = false;
    if (color === "b" && fr === 0 && fc === 0) next.bQ = false;
    if (color === "b" && fr === 0 && fc === 7) next.bK = false;
  }
  if (board[tr]?.[tc] && typeOf(board[tr]![tc]!) === "R") {
    if (color === "w" && tr === 7 && tc === 0) next.wQ = false;
    if (color === "w" && tr === 7 && tc === 7) next.wK = false;
    if (color === "b" && tr === 0 && tc === 0) next.bQ = false;
    if (color === "b" && tr === 0 && tc === 7) next.bK = false;
  }
  return next;
}

function nextEnPassant(board: (Piece | null)[][], move: Move): [number, number] | null {
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = board[fr]![fc];
  if (!piece || typeOf(piece) !== "P") return null;
  if (Math.abs(tr - fr) === 2) return [(fr + tr) / 2, fc];
  return null;
}

function inCheck(board: (Piece | null)[][], color: Color): boolean {
  const [kr, kc] = findKing(board, color);
  if (kr < 0) return true;
  const enemy: Color = color === "w" ? "b" : "w";
  return attacked(board, kr, kc, enemy);
}

export function getLegalMoves(state: ChessState, color: Color): Move[] {
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

export function applyMove(state: ChessState, move: Move): ChessState {
  const color = state.current;
  const castling = updateCastling(state.castling, state.board, move);
  const enPassant = nextEnPassant(state.board, move);
  const board = apply(state.board, move, state);
  const next: Color = color === "w" ? "b" : "w";
  const nextMoves = getLegalMoves({ board, current: next, winner: null, castling, enPassant: null }, next);
  const wMoves = getLegalMoves({ board, current: "w", winner: null, castling, enPassant: null }, "w");
  const bMoves = getLegalMoves({ board, current: "b", winner: null, castling, enPassant: null }, "b");
  let winner: ChessState["winner"] = null;
  if (wMoves.length === 0 && bMoves.length === 0) winner = "draw";
  else if (nextMoves.length === 0) {
    winner = inCheck(board, next) ? color : "draw";
  }
  return {
    board,
    current: winner ? color : next,
    winner,
    castling,
    enPassant: winner ? null : enPassant,
  };
}

export function cpuMove(
  state: ChessState,
  difficulty: "easy" | "normal" | "hard" = "normal"
): ChessState {
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
      const replyCount = getLegalMoves(after, "w").length;
      const captured = state.board[move.to[0]!]![move.to[1]!] ? 12 : 0;
      const score = captured - replyCount * 0.5;
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

export function computeScore(state: ChessState): number {
  if (state.winner === "w") return 100;
  if (state.winner === "draw") return 40;
  return 0;
}

export const PIECE_SYMBOL: Record<Piece, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

export const PROMOTION_PIECES: PieceType[] = ["Q", "R", "B", "N"];
