export interface ShuffleboardState {
  round: number;
  score: number;
  discX: number;
  power: number;
  powerDir: 1 | -1;
  status: "aiming" | "result" | "over";
  lastZone: number;
  lastPoints: number;
}

const MAX_ROUNDS = 8;
const TICK = 2.5;
const BOARD = 100;

export function createInitialState(): ShuffleboardState {
  return {
    round: 1,
    score: 0,
    discX: 10,
    power: 0,
    powerDir: 1,
    status: "aiming",
    lastZone: 0,
    lastPoints: 0,
  };
}

export function tickPower(state: ShuffleboardState): ShuffleboardState {
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

function zonePoints(x: number): number {
  if (x >= 88) return 4;
  if (x >= 72) return 3;
  if (x >= 52) return 2;
  if (x >= 30) return 1;
  return 0;
}

export function slide(state: ShuffleboardState): ShuffleboardState {
  if (state.status !== "aiming") return state;
  const dist = state.power * 0.85;
  const wobble = (Math.random() - 0.5) * 8;
  const discX = Math.min(BOARD - 2, Math.max(5, 10 + dist + wobble));
  const lastPoints = zonePoints(discX);
  const score = state.score + lastPoints;
  const nextRound = state.round + 1;
  if (nextRound > MAX_ROUNDS) {
    return {
      ...state,
      discX,
      score,
      lastZone: lastPoints,
      lastPoints,
      status: "over",
    };
  }
  return {
    ...state,
    round: nextRound,
    discX: 10,
    score,
    power: 0,
    powerDir: 1,
    status: "result",
    lastZone: lastPoints,
    lastPoints,
  };
}

export function nextRound(state: ShuffleboardState): ShuffleboardState {
  if (state.status !== "result") return state;
  return { ...state, status: "aiming", lastPoints: 0, lastZone: 0 };
}

export { BOARD as SHUFFLEBOARD_LEN };
