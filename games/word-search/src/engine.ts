export const SIZE = 10;

export const WORDS = ["GAME", "PLAY", "FUN", "WIN", "CODE", "FIND"] as const;

export interface WordSearchState {
  grid: string[][];
  found: string[];
  anchor: [number, number] | null;
  highlight: string[];
  status: "playing" | "won";
}

const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [-1, 1],
];

function emptyGrid(): string[][] {
  return Array.from({ length: SIZE }, () => Array<string>(SIZE).fill(""));
}

function canPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number
): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
    const cell = grid[r]![c];
    if (cell !== "" && cell !== word[i]) return false;
  }
  return true;
}

function placeWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number
): void {
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i]![col + dc * i] = word[i]!;
  }
}

function fillRandom(grid: string[][]): void {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r]![c] === "") {
        grid[r]![c] = letters[Math.floor(Math.random() * letters.length)]!;
      }
    }
  }
}

function buildGrid(): string[][] {
  const grid = emptyGrid();
  for (const word of WORDS) {
    let placed = false;
    for (let attempt = 0; attempt < 80 && !placed; attempt++) {
      const [dr, dc] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]!;
      const row = Math.floor(Math.random() * SIZE);
      const col = Math.floor(Math.random() * SIZE);
      if (canPlace(grid, word, row, col, dr, dc)) {
        placeWord(grid, word, row, col, dr, dc);
        placed = true;
      }
    }
    if (!placed) {
      placeWord(grid, word, 0, 0, 0, 1);
    }
  }
  fillRandom(grid);
  return grid;
}

export function createInitialState(): WordSearchState {
  return {
    grid: buildGrid(),
    found: [],
    anchor: null,
    highlight: [],
    status: "playing",
  };
}

function key(r: number, c: number): string {
  return `${r},${c}`;
}

function cellsBetween(a: [number, number], b: [number, number]): [number, number][] | null {
  const [r1, c1] = a;
  const [r2, c2] = b;
  const dr = r2 - r1;
  const dc = c2 - c1;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  if (steps === 0) return [[r1, c1]];
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const sr = dr === 0 ? 0 : dr / Math.abs(dr);
  const sc = dc === 0 ? 0 : dc / Math.abs(dc);
  const cells: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push([r1 + sr * i, c1 + sc * i]);
  }
  return cells;
}

function wordFromCells(grid: string[][], cells: [number, number][]): string {
  return cells.map(([r, c]) => grid[r]![c]).join("");
}

function reverse(s: string): string {
  return s.split("").reverse().join("");
}

export function selectCell(state: WordSearchState, row: number, col: number): WordSearchState {
  if (state.status === "won") return state;
  if (!state.anchor) {
    return { ...state, anchor: [row, col] };
  }
  const cells = cellsBetween(state.anchor, [row, col]);
  if (!cells) {
    return { ...state, anchor: [row, col] };
  }
  const forward = wordFromCells(state.grid, cells);
  const backward = reverse(forward);
  let matched: string | null = null;
  for (const w of WORDS) {
    if ((forward === w || backward === w) && !state.found.includes(w)) {
      matched = w;
      break;
    }
  }
  const highlight = [...state.highlight];
  if (matched) {
    for (const cell of cells) {
      const k = key(cell[0], cell[1]);
      if (!highlight.includes(k)) highlight.push(k);
    }
    const found = [...state.found, matched];
    const status = found.length === WORDS.length ? "won" : "playing";
    return { ...state, found, highlight, anchor: null, status };
  }
  return { ...state, anchor: [row, col] };
}

export function clearSelection(state: WordSearchState): WordSearchState {
  return { ...state, anchor: null };
}

export function computeScore(state: WordSearchState): number {
  return state.found.length * 100 + (state.status === "won" ? 200 : 0);
}

export function isHighlighted(state: WordSearchState, r: number, c: number): boolean {
  return state.highlight.includes(key(r, c));
}

export function isAnchor(state: WordSearchState, r: number, c: number): boolean {
  return state.anchor?.[0] === r && state.anchor?.[1] === c;
}
