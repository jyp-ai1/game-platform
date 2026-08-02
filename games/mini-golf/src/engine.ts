import {
  coursePar,
  FINAL_MINI_GOLF_HOLE,
  getMiniGolfHole,
} from "./mini-golf-stage-config";

export interface MiniGolfState {
  holeIndex: number;
  ballX: number;
  ballY: number;
  holeX: number;
  holeY: number;
  par: number;
  holeStrokes: number;
  totalStrokes: number;
  angle: number;
  angleDir: 1 | -1;
  power: number;
  powerDir: 1 | -1;
  status: "aiming" | "over";
  lastHoleIn: boolean;
}

const W = 100;
const H = 100;
const HOLE_R = 5.5;
const BALL_R = 2;
const MAX_STROKES_PER_HOLE = 12;

function holeLayout(holeIndex: number): Pick<
  MiniGolfState,
  "ballX" | "ballY" | "holeX" | "holeY" | "par" | "holeStrokes"
> {
  const h = getMiniGolfHole(holeIndex);
  return {
    ballX: h.ballX,
    ballY: h.ballY,
    holeX: h.holeX,
    holeY: h.holeY,
    par: h.par,
    holeStrokes: 0,
  };
}

export function createInitialState(holeIndex = 1, totalStrokes = 0): MiniGolfState {
  return {
    holeIndex,
    totalStrokes,
    angle: 0,
    angleDir: 1,
    power: 0,
    powerDir: 1,
    status: "aiming",
    lastHoleIn: false,
    ...holeLayout(holeIndex),
  };
}

export function tickAim(state: MiniGolfState): MiniGolfState {
  if (state.status !== "aiming") return state;
  let angle = state.angle + state.angleDir * 1.2;
  let angleDir = state.angleDir;
  if (angle >= 45) {
    angle = 45;
    angleDir = -1;
  } else if (angle <= -45) {
    angle = -45;
    angleDir = 1;
  }
  let power = state.power + state.powerDir * 2;
  let powerDir = state.powerDir;
  if (power >= 100) {
    power = 100;
    powerDir = -1;
  } else if (power <= 0) {
    power = 0;
    powerDir = 1;
  }
  return { ...state, angle, angleDir, power, powerDir };
}

export function putt(state: MiniGolfState): MiniGolfState {
  if (state.status !== "aiming") return state;
  const rad = (state.angle * Math.PI) / 180;
  const dist = state.power * 0.55;
  let ballX = state.ballX + Math.cos(rad) * dist;
  let ballY = state.ballY + Math.sin(rad) * dist * 0.35;
  ballX = Math.max(BALL_R, Math.min(W - BALL_R, ballX));
  ballY = Math.max(BALL_R, Math.min(H - BALL_R, ballY));
  const holeStrokes = state.holeStrokes + 1;
  const totalStrokes = state.totalStrokes + 1;
  const dx = ballX - state.holeX;
  const dy = ballY - state.holeY;
  const inHole = Math.hypot(dx, dy) <= HOLE_R + BALL_R;

  if (inHole) {
    if (state.holeIndex >= FINAL_MINI_GOLF_HOLE) {
      return {
        ...state,
        ballX,
        ballY,
        holeStrokes,
        totalStrokes,
        status: "over",
        lastHoleIn: true,
        power: 0,
        powerDir: 1,
      };
    }
    const nextHole = state.holeIndex + 1;
    return {
      ...createInitialState(nextHole, totalStrokes),
      lastHoleIn: true,
    };
  }

  if (holeStrokes >= MAX_STROKES_PER_HOLE) {
    if (state.holeIndex >= FINAL_MINI_GOLF_HOLE) {
      return {
        ...state,
        ballX,
        ballY,
        holeStrokes,
        totalStrokes,
        status: "over",
        lastHoleIn: false,
        power: 0,
        powerDir: 1,
      };
    }
    const nextHole = state.holeIndex + 1;
    return {
      ...createInitialState(nextHole, totalStrokes),
      lastHoleIn: false,
    };
  }

  return {
    ...state,
    ballX,
    ballY,
    holeStrokes,
    totalStrokes,
    status: "aiming",
    lastHoleIn: false,
    power: 0,
    powerDir: 1,
  };
}

export function computeScore(state: MiniGolfState): number {
  const course = coursePar();
  const underPar = course - state.totalStrokes;
  return Math.max(100 + underPar * 50, 50);
}

export { W as MINI_GOLF_W, H as MINI_GOLF_H, HOLE_R, BALL_R, coursePar, FINAL_MINI_GOLF_HOLE };
