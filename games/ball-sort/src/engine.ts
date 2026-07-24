// Ball Sort — same mechanics as color sort, 5 tubes / 4 colors
export type BallId = 1 | 2 | 3 | 4;

export interface BallSortState {
  tubes: BallId[][];
  selected: number | null;
  moves: number;
  status: "playing" | "won";
}

const CAP = 4;

function makeTubes(): BallId[][] {
  const balls: BallId[] = [];
  for (let c = 1; c <= 4; c++) {
    for (let i = 0; i < 3; i++) balls.push(c as BallId);
  }
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [balls[i], balls[j]] = [balls[j]!, balls[i]!];
  }
  return [
    balls.slice(0, 3),
    balls.slice(3, 6),
    balls.slice(6, 9),
    balls.slice(9, 12),
    [],
  ];
}

export function createInitialState(): BallSortState {
  return { tubes: makeTubes(), selected: null, moves: 0, status: "playing" };
}

function isSorted(tubes: BallId[][]): boolean {
  return tubes.every(
    (t) => t.length === 0 || (t.length === CAP && t.every((b) => b === t[0]))
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
  if (dst.length >= CAP) return { ...state, selected: null };
  if (dst.length > 0 && dst[dst.length - 1] !== ball) {
    return { ...state, selected: index };
  }
  src.pop();
  dst.push(ball);
  const moves = state.moves + 1;
  return { tubes, selected: null, moves, status: isSorted(tubes) ? "won" : "playing" };
}

export function computeScore(moves: number): number {
  return Math.max(600 - moves * 4, 60);
}
