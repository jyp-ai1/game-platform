export interface BasketballState {
  shot: number;
  score: number;
  made: number;
  power: number;
  powerDir: 1 | -1;
  status: "aiming" | "result" | "over";
  lastMade: boolean;
  lastPoints: number;
}

const MAX_SHOTS = 10;
const TICK = 2.8;
const SWEET_SPOT = 78;

export function createInitialState(): BasketballState {
  return {
    shot: 1,
    score: 0,
    made: 0,
    power: 0,
    powerDir: 1,
    status: "aiming",
    lastMade: false,
    lastPoints: 0,
  };
}

export function tickPower(state: BasketballState): BasketballState {
  if (state.status !== "aiming") return state;
  let power = state.power + state.powerDir * TICK;
  let powerDir = state.powerDir;
  if (power >= 100) {
    power = 100;
    powerDir = -1;
  } else if (power <= 0) {
    power = 0;
    powerDir = 1;
  }
  return { ...state, power, powerDir };
}

export function shoot(state: BasketballState): BasketballState {
  if (state.status !== "aiming") return state;
  const diff = Math.abs(state.power - SWEET_SPOT);
  const made = diff <= 18 + Math.random() * 6;
  const lastPoints = made ? (diff <= 6 ? 3 : 2) : 0;
  const score = state.score + lastPoints;
  const madeCount = state.made + (made ? 1 : 0);
  const nextShot = state.shot + 1;
  if (nextShot > MAX_SHOTS) {
    return {
      ...state,
      score,
      made: madeCount,
      lastMade: made,
      lastPoints,
      status: "over",
    };
  }
  return {
    ...state,
    shot: nextShot,
    score,
    made: madeCount,
    power: 0,
    powerDir: 1,
    status: "result",
    lastMade: made,
    lastPoints,
  };
}

export function nextShot(state: BasketballState): BasketballState {
  if (state.status !== "result") return state;
  return { ...state, status: "aiming", lastMade: false, lastPoints: 0 };
}
