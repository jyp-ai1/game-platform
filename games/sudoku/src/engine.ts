export type Board = (number | null)[][]; // 9x9, null = empty cell

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface SudokuState {
  puzzle: Board; // the fixed given cells (a cell is locked iff puzzle[r][c] !== null)
  board: Board; // current working board (starts as a copy of puzzle)
  solution: Board; // the complete solved board, used only to validate entries
  selectedCell: { row: number; col: number } | null;
  mistakes: number;
  maxMistakes: number;
  status: "playing" | "won" | "over";
}

const SIZE = 9;
const BOX_SIZE = 3;
const MAX_MISTAKES = 3;

const GIVENS_BY_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 40,
  MEDIUM: 32,
  HARD: 30,
};

function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<number | null>(SIZE).fill(null));
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

function shuffledDigits(): number[] {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = digits[i]!;
    digits[i] = digits[j]!;
    digits[j] = temp;
  }
  return digits;
}

function isValidPlacement(board: Board, row: number, col: number, value: number): boolean {
  for (let c = 0; c < SIZE; c++) {
    if (c !== col && board[row]![c] === value) {
      return false;
    }
  }
  for (let r = 0; r < SIZE; r++) {
    if (r !== row && board[r]![col] === value) {
      return false;
    }
  }
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      if ((r !== row || c !== col) && board[r]![c] === value) {
        return false;
      }
    }
  }
  return true;
}

function findEmptyCell(board: Board): { row: number; col: number } | null {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r]![c] === null) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

// Backtracking solver used for generation: tries digits in a randomized
// order so that solving an empty board produces a random valid complete
// board. Mutates `board` in place and returns true once solved.
function solveRandomized(board: Board): boolean {
  const empty = findEmptyCell(board);
  if (!empty) {
    return true;
  }
  const { row, col } = empty;
  for (const digit of shuffledDigits()) {
    if (isValidPlacement(board, row, col, digit)) {
      board[row]![col] = digit;
      if (solveRandomized(board)) {
        return true;
      }
      board[row]![col] = null;
    }
  }
  return false;
}

function solveBoard(board: Board): Board | null {
  const working = cloneBoard(board);
  if (solveRandomized(working)) {
    return working;
  }
  return null;
}

// Counts solutions up to `limit`, stopping early once reached. Used to
// verify puzzle uniqueness without exploring the full search space — we
// only need to distinguish "exactly 1" from "more than 1".
function countSolutions(board: Board, limit: number): number {
  const working = cloneBoard(board);
  let count = 0;

  function backtrack(): boolean {
    // Returns true once `count` has reached `limit` (signal to stop).
    const empty = findEmptyCell(working);
    if (!empty) {
      count++;
      return count >= limit;
    }
    const { row, col } = empty;
    for (let digit = 1; digit <= 9; digit++) {
      if (isValidPlacement(working, row, col, digit)) {
        working[row]![col] = digit;
        const shouldStop = backtrack();
        working[row]![col] = null;
        if (shouldStop) {
          return true;
        }
      }
    }
    return false;
  }

  backtrack();
  return count;
}

function shuffledCellOrder(): Array<{ row: number; col: number }> {
  const cells: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      cells.push({ row: r, col: c });
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = cells[i]!;
    cells[i] = cells[j]!;
    cells[j] = temp;
  }
  return cells;
}

export function generatePuzzle(difficulty: Difficulty): { puzzle: Board; solution: Board } {
  const solution = solveBoard(createEmptyBoard())!;
  const puzzle = cloneBoard(solution);
  const targetGivens = GIVENS_BY_DIFFICULTY[difficulty];

  let filledCount = SIZE * SIZE;
  const cellOrder = shuffledCellOrder();

  for (const { row, col } of cellOrder) {
    if (filledCount <= targetGivens) {
      break;
    }
    const value: number | null = puzzle[row]![col] ?? null;
    if (value === null) {
      continue;
    }
    puzzle[row]![col] = null;
    const solutions = countSolutions(puzzle, 2);
    if (solutions === 1) {
      filledCount--;
    } else {
      // Ambiguous (or somehow unsolvable) — put the value back.
      puzzle[row]![col] = value;
    }
  }

  return { puzzle, solution };
}

export function createInitialState(difficulty: Difficulty = "MEDIUM"): SudokuState {
  const { puzzle, solution } = generatePuzzle(difficulty);
  return {
    puzzle,
    board: cloneBoard(puzzle),
    solution,
    selectedCell: null,
    mistakes: 0,
    maxMistakes: MAX_MISTAKES,
    status: "playing",
  };
}

export function selectCell(state: SudokuState, row: number, col: number): SudokuState {
  return { ...state, selectedCell: { row, col } };
}

function boardsMatch(a: Board, b: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (a[r]![c] !== b[r]![c]) {
        return false;
      }
    }
  }
  return true;
}

export function enterValue(state: SudokuState, value: number | null): SudokuState {
  if (state.status !== "playing" || !state.selectedCell) {
    return state;
  }
  const { row, col } = state.selectedCell;
  if (state.puzzle[row]![col] !== null) {
    return state;
  }

  const board = cloneBoard(state.board);
  board[row]![col] = value;

  let mistakes = state.mistakes;
  if (value !== null && value !== state.solution[row]![col]) {
    mistakes++;
  }

  if (mistakes >= state.maxMistakes) {
    return { ...state, board, mistakes, status: "over" };
  }

  const won = boardsMatch(board, state.solution);
  return { ...state, board, mistakes, status: won ? "won" : "playing" };
}
