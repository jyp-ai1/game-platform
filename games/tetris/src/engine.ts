export const COLS = 10;
export const ROWS = 20;

export type Cell = string | null;

export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: "#22d3ee",
  O: "#facc15",
  T: "#a78bfa",
  S: "#4ade80",
  Z: "#f87171",
  J: "#60a5fa",
  L: "#fb923c",
};

const TETROMINO_TYPES: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];

// Each shape is a flat 4x4 grid (row-major), rotation states are derived by
// rotating this base 90° clockwise N times rather than hand-writing 4 states
// per piece — fewer hand-authored values to get wrong.
const BASE_SHAPES: Record<TetrominoType, number[]> = {
  I: [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  O: [0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  T: [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  S: [0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Z: [1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  J: [1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  L: [0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

function rotateGrid4(grid: number[]): number[] {
  const result = new Array<number>(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      result[r * 4 + c] = grid[(3 - c) * 4 + r]!;
    }
  }
  return result;
}

function shapeForRotation(type: TetrominoType, rotation: number): number[] {
  let grid = BASE_SHAPES[type];
  const turns = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    grid = rotateGrid4(grid);
  }
  return grid;
}

export interface ActivePiece {
  type: TetrominoType;
  rotation: number;
  row: number;
  col: number;
}

export interface TetrisState {
  board: Cell[][];
  active: ActivePiece;
  next: TetrominoType;
  score: number;
  linesCleared: number;
  level: number;
  status: "playing" | "over";
}

export function randomType(): TetrominoType {
  return TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)]!;
}

function spawnPiece(type: TetrominoType): ActivePiece {
  return { type, rotation: 0, row: -1, col: Math.floor((COLS - 4) / 2) };
}

export function createEmptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

export function createInitialState(): TetrisState {
  return {
    board: createEmptyBoard(),
    active: spawnPiece(randomType()),
    next: randomType(),
    score: 0,
    linesCleared: 0,
    level: 1,
    status: "playing",
  };
}

/** Absolute board cells (row, col) occupied by an active piece. */
export function activeCells(active: ActivePiece): { row: number; col: number }[] {
  const shape = shapeForRotation(active.type, active.rotation);
  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (shape[r * 4 + c]) {
        cells.push({ row: active.row + r, col: active.col + c });
      }
    }
  }
  return cells;
}

export function isValidPosition(board: Cell[][], active: ActivePiece): boolean {
  for (const { row, col } of activeCells(active)) {
    if (col < 0 || col >= COLS || row >= ROWS) {
      return false;
    }
    if (row >= 0 && board[row]![col] !== null) {
      return false;
    }
  }
  return true;
}

export function tryMove(
  board: Cell[][],
  active: ActivePiece,
  dCol: number,
  dRow: number
): ActivePiece | null {
  const moved = { ...active, col: active.col + dCol, row: active.row + dRow };
  return isValidPosition(board, moved) ? moved : null;
}

// Simple kick table: try the raw rotation, then a few small horizontal
// nudges — not full SRS, but enough that rotating near a wall doesn't just
// silently fail.
const KICK_OFFSETS = [0, -1, 1, -2, 2];

export function tryRotate(board: Cell[][], active: ActivePiece): ActivePiece | null {
  const rotated = { ...active, rotation: (active.rotation + 1) % 4 };
  for (const dCol of KICK_OFFSETS) {
    const candidate = { ...rotated, col: rotated.col + dCol };
    if (isValidPosition(board, candidate)) {
      return candidate;
    }
  }
  return null;
}

export function hardDropRow(board: Cell[][], active: ActivePiece): number {
  let row = active.row;
  while (isValidPosition(board, { ...active, row: row + 1 })) {
    row += 1;
  }
  return row;
}

function mergeIntoBoard(board: Cell[][], active: ActivePiece): Cell[][] {
  const next = board.map((row) => row.slice());
  const color = TETROMINO_COLORS[active.type];
  for (const { row, col } of activeCells(active)) {
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      next[row]![col] = color;
    }
  }
  return next;
}

function clearLines(board: Cell[][]): { board: Cell[][]; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = ROWS - remaining.length;
  const board2 = [
    ...Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(null)),
    ...remaining,
  ];
  return { board: board2, cleared };
}

const LINE_SCORES = [0, 100, 300, 500, 800];

export function levelForLines(linesCleared: number): number {
  return 1 + Math.floor(linesCleared / 10);
}

export function gravityIntervalMs(level: number): number {
  return Math.max(100, 800 - (level - 1) * 60);
}

/** Locks the active piece into the board, clears lines, and spawns the next
 * piece — used by both soft-drop-can't-descend and hard-drop. */
export function lockPiece(state: TetrisState): TetrisState {
  const merged = mergeIntoBoard(state.board, state.active);
  const { board, cleared } = clearLines(merged);
  const score = state.score + (LINE_SCORES[cleared] ?? 0) * state.level;
  const linesCleared = state.linesCleared + cleared;
  const level = levelForLines(linesCleared);

  const nextActive = spawnPiece(state.next);
  const nextQueue = randomType();

  if (!isValidPosition(board, nextActive)) {
    return {
      ...state,
      board,
      score,
      linesCleared,
      level,
      status: "over",
    };
  }

  return {
    ...state,
    board,
    active: nextActive,
    next: nextQueue,
    score,
    linesCleared,
    level,
    status: "playing",
  };
}
