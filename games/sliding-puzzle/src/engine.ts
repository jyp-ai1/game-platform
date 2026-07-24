export interface SlidingPuzzleState {
  tiles: number[];
  moves: number;
  status: "playing" | "won";
}

const SIZE = 4;

function solved(): number[] {
  return Array.from({ length: SIZE * SIZE - 1 }, (_, i) => i + 1).concat(0);
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
  const inv = countInversions(tiles);
  const blankRow = Math.floor(tiles.indexOf(0) / SIZE);
  const fromBottom = SIZE - blankRow;
  return (fromBottom % 2 === 0) !== (inv % 2 === 1);
}

function shuffle(): number[] {
  let tiles = solved();
  do {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j]!, tiles[i]!];
    }
  } while (!isSolvable(tiles) || tiles.every((v, i) => v === solved()[i]));
  return tiles;
}

export function createInitialState(): SlidingPuzzleState {
  return { tiles: shuffle(), moves: 0, status: "playing" };
}

function idxToRC(i: number): [number, number] {
  return [Math.floor(i / SIZE), i % SIZE];
}

export function tapTile(state: SlidingPuzzleState, index: number): SlidingPuzzleState {
  if (state.status !== "playing" || state.tiles[index] === 0) return state;
  const blank = state.tiles.indexOf(0);
  const [br, bc] = idxToRC(blank);
  const [tr, tc] = idxToRC(index);
  if (Math.abs(br - tr) + Math.abs(bc - tc) !== 1) return state;
  const tiles = state.tiles.slice();
  tiles[blank] = tiles[index]!;
  tiles[index] = 0;
  const won = tiles.every((v, i) => v === solved()[i]);
  return { tiles, moves: state.moves + 1, status: won ? "won" : "playing" };
}

export function computeScore(moves: number): number {
  return Math.max(500 - moves * 3, 50);
}
