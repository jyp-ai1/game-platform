export type ColorId = 1 | 2 | 3;

export interface ColorSortState {
  tubes: ColorId[][];
  selected: number | null;
  moves: number;
  status: "playing" | "won";
}

const CAP = 4;

function makeTubes(): ColorId[][] {
  const colors: ColorId[] = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3];
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j]!, colors[i]!];
  }
  return [colors.slice(0, 4), colors.slice(4, 8), colors.slice(8, 12), []];
}

export function createInitialState(): ColorSortState {
  return { tubes: makeTubes(), selected: null, moves: 0, status: "playing" };
}

function isSorted(tubes: ColorId[][]): boolean {
  return tubes.every(
    (t) =>
      t.length === 0 ||
      (t.length === CAP && t.every((c) => c === t[0]))
  );
}

export function tapTube(state: ColorSortState, index: number): ColorSortState {
  if (state.status !== "playing") return state;
  const tubes = state.tubes.map((t) => [...t]);
  if (state.selected === null) {
    if (tubes[index]!.length === 0) return state;
    return { ...state, selected: index };
  }
  if (state.selected === index) {
    return { ...state, selected: null };
  }
  const from = state.selected;
  const src = tubes[from]!;
  const dst = tubes[index]!;
  if (src.length === 0) return { ...state, selected: null };
  const ball = src[src.length - 1]!;
  if (dst.length >= CAP) return { ...state, selected: null };
  if (dst.length > 0 && dst[dst.length - 1] !== ball) {
    return { ...state, selected: index };
  }
  src.pop();
  dst.push(ball);
  const moves = state.moves + 1;
  const won = isSorted(tubes);
  return { tubes, selected: null, moves, status: won ? "won" : "playing" };
}

export function computeScore(moves: number): number {
  return Math.max(500 - moves * 5, 50);
}
