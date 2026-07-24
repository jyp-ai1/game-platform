export interface Block {
  x: number;
  width: number;
}

export interface StackTowerState {
  stack: Block[];
  current: { x: number; width: number; dir: 1 | -1 };
  score: number;
  status: "playing" | "over";
}

const BOARD = 100;
const SPEED = 2.2;
const INITIAL_WIDTH = 40;

export function createInitialState(): StackTowerState {
  return {
    stack: [{ x: 30, width: INITIAL_WIDTH }],
    current: { x: 0, width: INITIAL_WIDTH, dir: 1 },
    score: 0,
    status: "playing",
  };
}

export function tick(state: StackTowerState): StackTowerState {
  if (state.status !== "playing") return state;
  let { x, width, dir } = state.current;
  x += dir * SPEED;
  if (x <= 0) {
    x = 0;
    dir = 1;
  } else if (x + width >= BOARD) {
    x = BOARD - width;
    dir = -1;
  }
  return { ...state, current: { x, width, dir } };
}

export function placeBlock(state: StackTowerState): StackTowerState {
  if (state.status !== "playing") return state;
  const top = state.stack[state.stack.length - 1]!;
  const cur = state.current;
  const left = Math.max(top.x, cur.x);
  const right = Math.min(top.x + top.width, cur.x + cur.width);
  const overlap = right - left;
  if (overlap <= 2) {
    return { ...state, status: "over" };
  }
  const newBlock: Block = { x: left, width: overlap };
  const score = state.score + Math.round(overlap);
  const nextWidth = Math.max(overlap - 1, 8);
  return {
    stack: [...state.stack, newBlock],
    current: { x: 0, width: nextWidth, dir: 1 },
    score,
    status: "playing",
  };
}
