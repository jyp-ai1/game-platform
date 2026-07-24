export const SIZE = 4;

export type CellKind = "blank" | "clue" | "entry";

export interface ClueCell {
  kind: "clue";
  across?: number;
  down?: number;
}

export interface EntryCell {
  kind: "entry";
  solution: number;
}

export interface BlankCell {
  kind: "blank";
}

export type Cell = ClueCell | EntryCell | BlankCell;

export interface KakuroState {
  grid: Cell[][];
  entries: (number | null)[][];
  selected: [number, number] | null;
  status: "playing" | "won";
}

const LAYOUT: Cell[][] = [
  [
    { kind: "blank" },
    { kind: "clue", down: 4 },
    { kind: "clue", down: 6 },
    { kind: "blank" },
  ],
  [
    { kind: "clue", across: 3 },
    { kind: "entry", solution: 1 },
    { kind: "entry", solution: 2 },
    { kind: "blank" },
  ],
  [
    { kind: "blank" },
    { kind: "clue", across: 5, down: 7 },
    { kind: "entry", solution: 3 },
    { kind: "entry", solution: 4 },
  ],
  [
    { kind: "clue", across: 4 },
    { kind: "entry", solution: 1 },
    { kind: "entry", solution: 3 },
    { kind: "entry", solution: 4 },
  ],
];

function emptyEntries(): (number | null)[][] {
  return Array.from({ length: SIZE }, () => Array<number | null>(SIZE).fill(null));
}

export function createInitialState(): KakuroState {
  return {
    grid: LAYOUT.map((row) => row.map((c) => ({ ...c }))),
    entries: emptyEntries(),
    selected: null,
    status: "playing",
  };
}

export function cellKind(grid: Cell[][], r: number, c: number): CellKind {
  return grid[r]![c]!.kind;
}

export function selectCell(state: KakuroState, row: number, col: number): KakuroState {
  if (state.status === "won" || state.grid[row]![col]!.kind !== "entry") return state;
  return { ...state, selected: [row, col] };
}

export function enterDigit(state: KakuroState, digit: number): KakuroState {
  if (state.status === "won" || !state.selected || digit < 1 || digit > 9) return state;
  const [row, col] = state.selected;
  if (state.grid[row]![col]!.kind !== "entry") return state;
  const entries = state.entries.map((r) => [...r]);
  entries[row]![col] = digit;
  const won = checkWin(state.grid, entries);
  return { ...state, entries, status: won ? "won" : "playing" };
}

export function clearCell(state: KakuroState): KakuroState {
  if (!state.selected) return state;
  const [row, col] = state.selected;
  const entries = state.entries.map((r) => [...r]);
  entries[row]![col] = null;
  return { ...state, entries, status: "playing" };
}

function checkWin(grid: Cell[][], entries: (number | null)[][]): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = grid[r]![c]!;
      if (cell.kind !== "entry") continue;
      if (entries[r]![c] !== cell.solution) return false;
    }
  }
  return true;
}

export function computeScore(state: KakuroState): number {
  return state.status === "won" ? 600 : 0;
}

export function renderClue(cell: ClueCell): string {
  const parts: string[] = [];
  if (cell.down !== undefined) parts.push(`↓${cell.down}`);
  if (cell.across !== undefined) parts.push(`→${cell.across}`);
  return parts.join(" ");
}
