export interface BowlingState {
  frame: number;
  pins: number;
  score: number;
  power: number;
  powerDir: 1 | -1;
  status: "aiming" | "rolling" | "frame-end" | "over";
  lastKnock: number;
}

const MAX_FRAMES = 5;
const TICK = 2.5;

export function createInitialState(): BowlingState {
  return { frame: 1, pins: 10, score: 0, power: 0, powerDir: 1, status: "aiming", lastKnock: 0 };
}

export function tickPower(state: BowlingState): BowlingState {
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

export function roll(state: BowlingState): BowlingState {
  if (state.status !== "aiming") return state;
  const accuracy = 100 - Math.abs(state.power - 72);
  const knock = Math.min(state.pins, Math.max(0, Math.round((accuracy / 100) * state.pins + Math.random() * 2)));
  const score = state.score + knock * 10;
  const pinsLeft = state.pins - knock;
  if (pinsLeft <= 0 || state.frame >= MAX_FRAMES) {
    const nextFrame = state.frame + 1;
    if (nextFrame > MAX_FRAMES) {
      return { ...state, score, pins: 0, lastKnock: knock, status: "over" };
    }
    return { frame: nextFrame, pins: 10, score, power: 0, powerDir: 1, status: "aiming", lastKnock: knock };
  }
  return { ...state, pins: pinsLeft, score, power: 0, powerDir: 1, status: "aiming", lastKnock: knock };
}
