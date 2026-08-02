export type ColorId = 1 | 2 | 3 | 4;

export interface ColorSortState {
  tubes: ColorId[][];
  selected: number | null;
  moves: number;
  status: "playing" | "won";
}

const CAP = 4;
const COLOR_COUNT = 4;
const TUBE_COUNT = 6;

function makeTubes(): ColorId[][] {
  const colors: ColorId[] = [];
  for (let c = 1; c <= COLOR_COUNT; c++) {
    for (let i = 0; i < CAP; i++) colors.push(c as ColorId);
  }
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j]!, colors[i]!];
  }
  const tubes: ColorId[][] = [[], [], [], [], [], []];
  colors.forEach((color, i) => {
    tubes[i % 4]!.push(color);
  });
  return tubes;
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
  let run = 1;
  for (let i = src.length - 2; i >= 0 && src[i] === ball; i--) run++;
  const moveCount = Math.min(run, CAP - dst.length);
  for (let i = 0; i < moveCount; i++) dst.push(src.pop()!);
  const moves = state.moves + 1;
  const won = isSorted(tubes);
  return { tubes, selected: null, moves, status: won ? "won" : "playing" };
}

export function computeScore(moves: number): number {
  return Math.max(500 - moves * 5, 50);
}

export { CAP, COLOR_COUNT, TUBE_COUNT };
