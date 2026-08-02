import {
  type JigsawDifficulty,
  gridSizeForDifficulty,
} from "./jigsaw-stage-config";

export interface JigsawState {
  tiles: number[];
  moves: number;
  status: "playing" | "won";
  difficulty: JigsawDifficulty;
  size: number;
}

const COLORS = [
  "#5B5BD6", "#0ea5e9", "#22c55e",
  "#FFB800", "#ef4444", "#a855f7",
  "#14b8a6", "#f97316",
  "#ec4899", "#6366f1", "#84cc16",
  "#06b6d4", "#f43f5e", "#8b5cf6",
  "#10b981", "#eab308", "#64748b",
  "#0d9488", "#c026d3", "#ea580c",
  "#2563eb", "#16a34a", "#ca8a04", "#dc2626",
];

function solved(size: number): number[] {
  return Array.from({ length: size * size - 1 }, (_, i) => i + 1).concat(0);
}

function countInversions(arr: number[]): number {
  let n = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 0) continue;
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] !== 0 && arr[i]! > arr[j]!) n++;
    }
  }
  return n;
}

function isSolvable(tiles: number[]): boolean {
  return countInversions(tiles) % 2 === 0;
}

function shuffle(size: number): number[] {
  let tiles = solved(size);
  do {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j]!, tiles[i]!];
    }
  } while (!isSolvable(tiles) || tiles.every((v, i) => v === solved(size)[i]));
  return tiles;
}

export function createInitialState(difficulty: JigsawDifficulty = "MEDIUM"): JigsawState {
  const size = gridSizeForDifficulty(difficulty);
  return { tiles: shuffle(size), moves: 0, status: "playing", difficulty, size };
}

function idxToRC(i: number, size: number): [number, number] {
  return [Math.floor(i / size), i % size];
}

export function tapTile(state: JigsawState, index: number): JigsawState {
  if (state.status !== "playing" || state.tiles[index] === 0) return state;
  const blank = state.tiles.indexOf(0);
  const [br, bc] = idxToRC(blank, state.size);
  const [tr, tc] = idxToRC(index, state.size);
  if (Math.abs(br - tr) + Math.abs(bc - tc) !== 1) return state;
  const tiles = state.tiles.slice();
  tiles[blank] = tiles[index]!;
  tiles[index] = 0;
  const won = tiles.every((v, i) => v === solved(state.size)[i]);
  return { tiles, moves: state.moves + 1, status: won ? "won" : "playing", difficulty: state.difficulty, size: state.size };
}

export function computeScore(moves: number, size: number): number {
  const base = size === 3 ? 200 : size === 4 ? 400 : 600;
  return Math.max(base - moves * 5, 30);
}

export function tileColor(tile: number): string {
  if (tile === 0) return "transparent";
  return COLORS[(tile - 1) % COLORS.length]!;
}

export type { JigsawDifficulty };
