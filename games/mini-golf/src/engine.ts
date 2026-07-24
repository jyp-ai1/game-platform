export interface MiniGolfState {
  ballX: number;
  ballY: number;
  holeX: number;
  holeY: number;
  angle: number;
  angleDir: 1 | -1;
  power: number;
  powerDir: 1 | -1;
  strokes: number;
  status: "aiming" | "moving" | "over";
}

const W = 100;
const H = 100;
const HOLE_R = 5.5;
const BALL_R = 2;

export function createInitialState(): MiniGolfState {
  return {
    ballX: 15,
    ballY: 50,
    holeX: 85,
    holeY: 50,
    angle: 0,
    angleDir: 1,
    power: 0,
    powerDir: 1,
    strokes: 0,
    status: "aiming",
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
  const strokes = state.strokes + 1;
  const dx = ballX - state.holeX;
  const dy = ballY - state.holeY;
  const inHole = Math.hypot(dx, dy) <= HOLE_R + BALL_R;
  if (inHole || strokes >= 12) {
    return {
      ...state,
      ballX,
      ballY,
      strokes,
      status: "over",
      power: 0,
      powerDir: 1,
    };
  }
  return {
    ...state,
    ballX,
    ballY,
    strokes,
    status: "aiming",
    power: 0,
    powerDir: 1,
  };
}

export function computeScore(state: MiniGolfState): number {
  const dx = state.ballX - state.holeX;
  const dy = state.ballY - state.holeY;
  const inHole = Math.hypot(dx, dy) <= HOLE_R + BALL_R;
  if (inHole) return Math.max(500 - state.strokes * 40, 100);
  return Math.max(80 - state.strokes * 5, 10);
}

export { W as MINI_GOLF_W, H as MINI_GOLF_H, HOLE_R, BALL_R };
