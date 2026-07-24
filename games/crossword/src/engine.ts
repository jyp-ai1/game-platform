export const SIZE = 5;

export interface Clue {
  id: number;
  direction: "across" | "down";
  text: string;
  row: number;
  col: number;
  length: number;
}

export interface CrosswordState {
  solution: string[][];
  entries: (string | null)[][];
  clues: Clue[];
  selected: [number, number] | null;
  status: "playing" | "won";
}

const PUZZLE = {
  solution: [
    ["C", "A", "T", ".", "."],
    ["A", ".", ".", ".", "."],
    ["R", "E", "D", ".", "."],
    [".", ".", ".", ".", "."],
    [".", ".", ".", ".", "."],
  ],
  blocked: [
    [false, false, false, true, true],
    [false, true, true, true, true],
    [false, false, false, true, true],
    [true, true, true, true, true],
    [true, true, true, true, true],
  ],
  clues: [
    { id: 1, direction: "across" as const, text: "Feline pet", row: 0, col: 0, length: 3 },
    { id: 2, direction: "down" as const, text: "Vehicle", row: 0, col: 0, length: 3 },
    { id: 3, direction: "across" as const, text: "Color", row: 2, col: 0, length: 3 },
  ],
};

function emptyGrid(): (string | null)[][] {
  return Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) =>
      PUZZLE.blocked[r]![c] ? null : ""
    )
  );
}

export function createInitialState(): CrosswordState {
  return {
    solution: PUZZLE.solution.map((row) => [...row]),
    entries: emptyGrid(),
    clues: PUZZLE.clues,
    selected: null,
    status: "playing",
  };
}

function isBlocked(r: number, c: number): boolean {
  return PUZZLE.blocked[r]?.[c] ?? true;
}

export function selectCell(state: CrosswordState, row: number, col: number): CrosswordState {
  if (state.status === "won" || isBlocked(row, col)) return state;
  return { ...state, selected: [row, col] };
}

export function enterLetter(state: CrosswordState, letter: string): CrosswordState {
  if (state.status === "won" || !state.selected) return state;
  const [row, col] = state.selected;
  if (isBlocked(row, col)) return state;
  const entries = state.entries.map((r) => [...r]);
  entries[row]![col] = letter.toUpperCase().slice(0, 1);
  const won = checkWin(entries);
  return { ...state, entries, status: won ? "won" : "playing" };
}

export function clearCell(state: CrosswordState): CrosswordState {
  if (!state.selected) return state;
  const [row, col] = state.selected;
  const entries = state.entries.map((r) => [...r]);
  entries[row]![col] = "";
  return { ...state, entries, status: "playing" };
}

function checkWin(entries: (string | null)[][]): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (isBlocked(r, c)) continue;
      const expected = PUZZLE.solution[r]![c];
      if (expected === ".") continue;
      if (entries[r]![c] !== expected) return false;
    }
  }
  return true;
}

export function computeScore(state: CrosswordState): number {
  return state.status === "won" ? 500 : 0;
}

export function isPlayableCell(r: number, c: number): boolean {
  return !isBlocked(r, c);
}
