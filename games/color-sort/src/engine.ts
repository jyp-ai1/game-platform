import { getColorSortStage } from "./color-sort-stage-config";

export type ColorId = 1 | 2 | 3 | 4 | 5;

export interface ColorSortState {
  stageIndex: number;
  tubes: ColorId[][];
  selected: number | null;
  moves: number;
  lastMovedCount: number;
  status: "playing" | "won" | "stage-clear";
}

const CAP = 4;

function makeTubes(stageIndex: number): ColorId[][] {
  const stage = getColorSortStage(stageIndex);
  const colors: ColorId[] = [];
  for (let c = 1; c <= stage.colorCount; c++) {
    for (let i = 0; i < CAP; i++) colors.push(c as ColorId);
  }
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j]!, colors[i]!];
  }
  const filledCount = stage.tubeCount - stage.emptyTubes;
  const tubes: ColorId[][] = Array.from({ length: stage.tubeCount }, () => []);
  colors.forEach((color, i) => {
    tubes[i % filledCount]!.push(color);
  });
  return tubes;
}

export function createInitialState(stageIndex = 1): ColorSortState {
  return {
    stageIndex,
    tubes: makeTubes(stageIndex),
    selected: null,
    moves: 0,
    lastMovedCount: 0,
    status: "playing",
  };
}

function isSorted(tubes: ColorId[][], colorCount: number): boolean {
  return tubes.every(
    (t) =>
      t.length === 0 ||
      (t.length === CAP && t.every((c) => c === t[0]))
  ) && tubes.filter((t) => t.length === CAP).length === colorCount;
}

export function tapTube(state: ColorSortState, index: number): ColorSortState {
  if (state.status !== "playing") return state;
  const stage = getColorSortStage(state.stageIndex);
  const tubes = state.tubes.map((t) => [...t]);
  if (state.selected === null) {
    if (tubes[index]!.length === 0) return { ...state, lastMovedCount: 0 };
    return { ...state, selected: index, lastMovedCount: 0 };
  }
  if (state.selected === index) {
    return { ...state, selected: null, lastMovedCount: 0 };
  }
  const from = state.selected;
  const src = tubes[from]!;
  const dst = tubes[index]!;
  if (src.length === 0) return { ...state, selected: null, lastMovedCount: 0 };
  const ball = src[src.length - 1]!;
  if (dst.length >= CAP) return { ...state, selected: null, lastMovedCount: 0 };
  if (dst.length > 0 && dst[dst.length - 1] !== ball) {
    return { ...state, selected: index, lastMovedCount: 0 };
  }
  let run = 1;
  for (let i = src.length - 2; i >= 0 && src[i] === ball; i--) run++;
  const moveCount = Math.min(run, CAP - dst.length);
  for (let i = 0; i < moveCount; i++) dst.push(src.pop()!);
  const moves = state.moves + 1;
  const sorted = isSorted(tubes, stage.colorCount);
  return {
    tubes,
    selected: null,
    moves,
    lastMovedCount: moveCount,
    stageIndex: state.stageIndex,
    status: sorted ? "won" : "playing",
  };
}

export function advanceStage(state: ColorSortState): ColorSortState {
  if (state.status !== "won") return state;
  const next = state.stageIndex + 1;
  if (next > 3) {
    return { ...state, status: "stage-clear" };
  }
  return createInitialState(next);
}

export function computeScore(moves: number, stageIndex: number): number {
  return Math.max(500 - moves * 4 + stageIndex * 35, 50);
}

export { CAP };
