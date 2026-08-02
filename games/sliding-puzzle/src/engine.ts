import {
  type SlidingDifficulty,
  gridSizeForDifficulty,
} from "./sliding-stage-config";

export interface SlidingPuzzleState {
  tiles: number[];
  moves: number;
  status: "playing" | "won";
  difficulty: SlidingDifficulty;
  size: number;
}

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

function isSolvable(tiles: number[], size: number): boolean {
  const inv = countInversions(tiles);
  const blankRow = Math.floor(tiles.indexOf(0) / size);
  const fromBottom = size - blankRow;
  return (fromBottom % 2 === 0) !== (inv % 2 === 1);
}

function shuffle(size: number): number[] {
  let tiles = solved(size);
  do {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j]!, tiles[i]!];
    }
  } while (!isSolvable(tiles, size) || tiles.every((v, i) => v === solved(size)[i]));
  return tiles;
}

export function createInitialState(difficulty: SlidingDifficulty = "MEDIUM"): SlidingPuzzleState {
  const size = gridSizeForDifficulty(difficulty);
  return { tiles: shuffle(size), moves: 0, status: "playing", difficulty, size };
}

function idxToRC(i: number, size: number): [number, number] {
  return [Math.floor(i / size), i % size];
}

export function tapTile(state: SlidingPuzzleState, index: number): SlidingPuzzleState {
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
  const base = size === 3 ? 300 : size === 4 ? 500 : 700;
  return Math.max(base - moves * 3, 50);
}

export type { SlidingDifficulty };
