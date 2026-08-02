import { getBallSortStage } from "./ball-sort-stage-config";

export type BallId = 1 | 2 | 3 | 4 | 5;

export interface BallSortState {
  stageIndex: number;
  tubes: BallId[][];
  selected: number | null;
  moves: number;
  lastMovedCount: number;
  status: "playing" | "won" | "stage-clear";
}

const TUBE_CAPACITY = 4;

function makeTubes(stageIndex: number): BallId[][] {
  const stage = getBallSortStage(stageIndex);
  const balls: BallId[] = [];
  for (let c = 1; c <= stage.colorCount; c++) {
    for (let i = 0; i < TUBE_CAPACITY; i++) balls.push(c as BallId);
  }
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [balls[i], balls[j]] = [balls[j]!, balls[i]!];
  }
  const filledCount = stage.tubeCount - stage.emptyTubes;
  const tubes: BallId[][] = Array.from({ length: stage.tubeCount }, () => []);
  balls.forEach((ball, i) => {
    tubes[i % filledCount]!.push(ball);
  });
  return tubes;
}

export function createInitialState(stageIndex = 1): BallSortState {
  return {
    stageIndex,
    tubes: makeTubes(stageIndex),
    selected: null,
    moves: 0,
    lastMovedCount: 0,
    status: "playing",
  };
}

function isSorted(tubes: BallId[][], colorCount: number): boolean {
  return tubes.every(
    (t) =>
      t.length === 0 ||
      (t.length === TUBE_CAPACITY && t.every((b) => b === t[0]))
  ) && tubes.filter((t) => t.length === TUBE_CAPACITY).length === colorCount;
}

export function tapTube(state: BallSortState, index: number): BallSortState {
  if (state.status !== "playing") return state;
  const stage = getBallSortStage(state.stageIndex);
  const tubes = state.tubes.map((t) => [...t]);
  if (state.selected === null) {
    if (tubes[index]!.length === 0) return { ...state, lastMovedCount: 0 };
    return { ...state, selected: index, lastMovedCount: 0 };
  }
  if (state.selected === index) return { ...state, selected: null, lastMovedCount: 0 };
  const from = state.selected;
  const src = tubes[from]!;
  const dst = tubes[index]!;
  if (src.length === 0) return { ...state, selected: null, lastMovedCount: 0 };
  const ball = src[src.length - 1]!;
  if (dst.length >= TUBE_CAPACITY) return { ...state, selected: null, lastMovedCount: 0 };
  if (dst.length > 0 && dst[dst.length - 1] !== ball) {
    return { ...state, selected: index, lastMovedCount: 0 };
  }
  let run = 1;
  for (let i = src.length - 2; i >= 0 && src[i] === ball; i--) run++;
  const moveCount = Math.min(run, TUBE_CAPACITY - dst.length);
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

export function advanceStage(state: BallSortState): BallSortState {
  if (state.status !== "won") return state;
  const next = state.stageIndex + 1;
  if (next > 3) {
    return { ...state, status: "stage-clear" };
  }
  return createInitialState(next);
}

export function computeScore(moves: number, stageIndex: number): number {
  return Math.max(600 - moves * 3 + stageIndex * 40, 60);
}

export { TUBE_CAPACITY };
