export interface Ball {
  id: number;
  x: number;
  y: number;
  pocketed: boolean;
  color: string;
}

export interface BilliardsState {
  cueX: number;
  cueY: number;
  balls: Ball[];
  angle: number;
  angleDir: 1 | -1;
  power: number;
  powerDir: 1 | -1;
  score: number;
  shots: number;
  status: "aiming" | "over";
}

const W = 100;
const H = 60;
const POCKET_R = 5;

export function createInitialState(): BilliardsState {
  return {
    cueX: 25,
    cueY: 30,
    balls: [
      { id: 1, x: 70, y: 30, pocketed: false, color: "#ef4444" },
      { id: 2, x: 76, y: 26, pocketed: false, color: "#0ea5e9" },
      { id: 3, x: 76, y: 34, pocketed: false, color: "#22c55e" },
    ],
    angle: 0,
    angleDir: 1,
    power: 0,
    powerDir: 1,
    score: 0,
    shots: 0,
    status: "aiming",
  };
}

const POCKETS: Array<[number, number]> = [
  [2, 2],
  [50, 2],
  [98, 2],
  [2, 58],
  [50, 58],
  [98, 58],
];

function nearPocket(x: number, y: number): boolean {
  return POCKETS.some(([px, py]) => Math.hypot(x - px, y - py) <= POCKET_R);
}

export function tickAim(state: BilliardsState): BilliardsState {
  if (state.status !== "aiming") return state;
  let angle = state.angle + state.angleDir * 1.5;
  let angleDir = state.angleDir;
  if (angle >= 30) {
    angle = 30;
    angleDir = -1;
  } else if (angle <= -30) {
    angle = -30;
    angleDir = 1;
  }
  let power = state.power + state.powerDir * 2.5;
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

export function shoot(state: BilliardsState): BilliardsState {
  if (state.status !== "aiming") return state;
  const rad = (state.angle * Math.PI) / 180;
  const speed = state.power * 0.35;
  let cueX = state.cueX + Math.cos(rad) * speed;
  let cueY = state.cueY + Math.sin(rad) * speed;
  cueX = Math.max(3, Math.min(W - 3, cueX));
  cueY = Math.max(3, Math.min(H - 3, cueY));

  const balls = state.balls.map((b) => {
    if (b.pocketed) return b;
    const dx = b.x - state.cueX;
    const dy = b.y - state.cueY;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const dot = Math.cos(rad) * nx + Math.sin(rad) * ny;
    if (dot < 0.3) return b;
    let x = b.x + nx * speed * dot;
    let y = b.y + ny * speed * dot;
    x = Math.max(3, Math.min(W - 3, x));
    y = Math.max(3, Math.min(H - 3, y));
    const pocketed = nearPocket(x, y);
    return { ...b, x, y, pocketed };
  });

  const pocketedNow = balls.filter((b) => b.pocketed && !state.balls.find((o) => o.id === b.id)?.pocketed);
  const score = state.score + pocketedNow.length * 100;
  const allPocketed = balls.every((b) => b.pocketed);
  const shots = state.shots + 1;

  return {
    ...state,
    cueX,
    cueY,
    balls,
    score,
    shots,
    status: allPocketed || shots >= 15 ? "over" : "aiming",
    power: 0,
    powerDir: 1,
  };
}

export function computeScore(state: BilliardsState): number {
  return state.score;
}

export { W as BILLIARDS_W, H as BILLIARDS_H };
