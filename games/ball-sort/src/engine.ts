// Ball Sort — 4 colors × 4 balls, 6 tubes (4 filled + 2 empty)
export type BallId = 1 | 2 | 3 | 4;

export interface BallSortState {
  tubes: BallId[][];
  selected: number | null;
  moves: number;
  status: "playing" | "won";
}

const TUBE_CAPACITY = 4;
const BALLS_PER_COLOR = 4;
const COLOR_COUNT = 4;
const TUBE_COUNT = 6;

function makeTubes(): BallId[][] {
  const balls: BallId[] = [];
  for (let c = 1; c <= COLOR_COUNT; c++) {
    for (let i = 0; i < BALLS_PER_COLOR; i++) balls.push(c as BallId);
  }
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [balls[i], balls[j]] = [balls[j]!, balls[i]!];
  }
  const tubes: BallId[][] = [[], [], [], [], [], []];
  balls.forEach((ball, i) => {
    tubes[i % 4]!.push(ball);
  });
  return tubes;
}

export function createInitialState(): BallSortState {
  return { tubes: makeTubes(), selected: null, moves: 0, status: "playing" };
}

function isSorted(tubes: BallId[][]): boolean {
  return tubes.every(
    (t) =>
      t.length === 0 ||
      (t.length === BALLS_PER_COLOR && t.every((b) => b === t[0]))
  );
}

export function tapTube(state: BallSortState, index: number): BallSortState {
  if (state.status !== "playing") return state;
  const tubes = state.tubes.map((t) => [...t]);
  if (state.selected === null) {
    if (tubes[index]!.length === 0) return state;
    return { ...state, selected: index };
  }
  if (state.selected === index) return { ...state, selected: null };
  const from = state.selected;
  const src = tubes[from]!;
  const dst = tubes[index]!;
  if (src.length === 0) return { ...state, selected: null };
  const ball = src[src.length - 1]!;
  if (dst.length >= TUBE_CAPACITY) return { ...state, selected: null };
  if (dst.length > 0 && dst[dst.length - 1] !== ball) {
    return { ...state, selected: index };
  }
  let run = 1;
  for (let i = src.length - 2; i >= 0 && src[i] === ball; i--) run++;
  const moveCount = Math.min(run, TUBE_CAPACITY - dst.length);
  for (let i = 0; i < moveCount; i++) dst.push(src.pop()!);
  const moves = state.moves + 1;
  return { tubes, selected: null, moves, status: isSorted(tubes) ? "won" : "playing" };
}

export function computeScore(moves: number): number {
  return Math.max(600 - moves * 4, 60);
}
