export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pocketed: boolean;
  color: string;
}

export interface BilliardsState {
  cueX: number;
  cueY: number;
  cueVx: number;
  cueVy: number;
  balls: Ball[];
  angle: number;
  angleDir: 1 | -1;
  power: number;
  powerDir: 1 | -1;
  score: number;
  shots: number;
  status: "aiming" | "rolling" | "over";
  lastPocketFlash: number | null;
  pocketPulse: number;
}

const W = 100;
const H = 60;
const POCKET_R = 5;
const BALL_R = 2.2;
const FRICTION = 0.985;
const MIN_SPEED = 0.15;
export const MAX_SHOTS = 15;

export const POCKETS: Array<[number, number]> = [
  [2, 2],
  [50, 2],
  [98, 2],
  [2, 58],
  [50, 58],
  [98, 58],
];

function nearPocket(x: number, y: number): [number, number] | null {
  for (const [px, py] of POCKETS) {
    if (Math.hypot(x - px, y - py) <= POCKET_R + 0.5) return [px, py];
  }
  return null;
}

function pocketPull(x: number, y: number, vx: number, vy: number): { x: number; y: number; vx: number; vy: number } {
  let nearest: [number, number] | null = null;
  let nearestDist = Infinity;
  for (const p of POCKETS) {
    const d = Math.hypot(x - p[0], y - p[1]);
    if (d < POCKET_R * 2.2 && d < nearestDist) {
      nearestDist = d;
      nearest = p;
    }
  }
  if (!nearest) return { x, y, vx, vy };
  const dx = nearest[0] - x;
  const dy = nearest[1] - y;
  const dist = Math.hypot(dx, dy) || 1;
  const pull = Math.max(0, (POCKET_R * 2 - dist) / POCKET_R) * 0.35;
  return {
    x: x + (dx / dist) * pull,
    y: y + (dy / dist) * pull,
    vx: vx + (dx / dist) * pull * 0.5,
    vy: vy + (dy / dist) * pull * 0.5,
  };
}

function clampWall(x: number, y: number, vx: number, vy: number): { x: number; y: number; vx: number; vy: number } {
  let nx = x;
  let ny = y;
  let nvx = vx;
  let nvy = vy;
  const pad = BALL_R + 0.5;
  if (nx < pad) {
    nx = pad;
    nvx = Math.abs(nvx) * 0.85;
  } else if (nx > W - pad) {
    nx = W - pad;
    nvx = -Math.abs(nvx) * 0.85;
  }
  if (ny < pad) {
    ny = pad;
    nvy = Math.abs(nvy) * 0.85;
  } else if (ny > H - pad) {
    ny = H - pad;
    nvy = -Math.abs(nvy) * 0.85;
  }
  return { x: nx, y: ny, vx: nvx, vy: nvy };
}

function resolveBallCollision(a: Ball, b: Ball): [Ball, Ball] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const minDist = BALL_R * 2;
  if (dist >= minDist) return [a, b];
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  const ax = a.x - nx * overlap * 0.5;
  const ay = a.y - ny * overlap * 0.5;
  const bx = b.x + nx * overlap * 0.5;
  const by = b.y + ny * overlap * 0.5;
  const relVx = a.vx - b.vx;
  const relVy = a.vy - b.vy;
  const dot = relVx * nx + relVy * ny;
  if (dot <= 0) return [{ ...a, x: ax, y: ay }, { ...b, x: bx, y: by }];
  const impulse = dot * 0.9;
  return [
    { ...a, x: ax, y: ay, vx: a.vx - impulse * nx, vy: a.vy - impulse * ny },
    { ...b, x: bx, y: by, vx: b.vx + impulse * nx, vy: b.vy + impulse * ny },
  ];
}

export function createInitialState(): BilliardsState {
  return {
    cueX: 25,
    cueY: 30,
    cueVx: 0,
    cueVy: 0,
    balls: [
      { id: 1, x: 70, y: 30, vx: 0, vy: 0, pocketed: false, color: "#ef4444" },
      { id: 2, x: 76, y: 26, vx: 0, vy: 0, pocketed: false, color: "#0ea5e9" },
      { id: 3, x: 76, y: 34, vx: 0, vy: 0, pocketed: false, color: "#22c55e" },
    ],
    angle: 0,
    angleDir: 1,
    power: 0,
    powerDir: 1,
    score: 0,
    shots: 0,
    status: "aiming",
    lastPocketFlash: null,
    pocketPulse: 0,
  };
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
  const speed = state.power * 0.12;
  const cueVx = Math.cos(rad) * speed;
  const cueVy = Math.sin(rad) * speed;
  return {
    ...state,
    balls: state.balls.map((b) => ({ ...b })),
    status: "rolling",
    shots: state.shots + 1,
    power: 0,
    powerDir: 1,
    lastPocketFlash: null,
    cueVx,
    cueVy,
  };
}

export function tickRolling(state: BilliardsState): BilliardsState {
  if (state.status !== "rolling") return state;

  let cueX = state.cueX + state.cueVx;
  let cueY = state.cueY + state.cueVy;
  let cvx = state.cueVx * FRICTION;
  let cvy = state.cueVy * FRICTION;

  const pulled = pocketPull(cueX, cueY, cvx, cvy);
  cueX = pulled.x;
  cueY = pulled.y;
  cvx = pulled.vx;
  cvy = pulled.vy;

  const wall = clampWall(cueX, cueY, cvx, cvy);
  cueX = wall.x;
  cueY = wall.y;
  cvx = wall.vx;
  cvy = wall.vy;

  let balls = state.balls.map((b) => {
    if (b.pocketed) return b;
    let x = b.x + b.vx;
    let y = b.y + b.vy;
    let vx = b.vx * FRICTION;
    let vy = b.vy * FRICTION;
    const pp = pocketPull(x, y, vx, vy);
    x = pp.x;
    y = pp.y;
    vx = pp.vx;
    vy = pp.vy;
    const w = clampWall(x, y, vx, vy);
    return { ...b, x: w.x, y: w.y, vx: w.vx, vy: w.vy };
  });

  let lastPocketFlash: number | null = state.lastPocketFlash;
  let pocketPulse = Math.max(0, state.pocketPulse - 1);
  let scoreGain = 0;

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i]!;
    if (b.pocketed) continue;
    const pocket = nearPocket(b.x, b.y);
    if (pocket) {
      balls[i] = { ...b, pocketed: true, vx: 0, vy: 0 };
      scoreGain += 100;
      lastPocketFlash = pocket[0] * 1000 + pocket[1];
      pocketPulse = 8;
    }
  }

  const cuePocket = nearPocket(cueX, cueY);
  if (cuePocket) {
    cvx = 0;
    cvy = 0;
    cueX = 25;
    cueY = 30;
    lastPocketFlash = cuePocket[0] * 1000 + cuePocket[1];
    pocketPulse = 8;
  }

  for (let i = 0; i < balls.length; i++) {
    if (balls[i]!.pocketed) continue;
    const hit = resolveBallCollision(
      { id: 0, x: cueX, y: cueY, vx: cvx, vy: cvy, pocketed: false, color: "#fff" },
      balls[i]!
    );
    cueX = hit[0].x;
    cueY = hit[0].y;
    cvx = hit[0].vx;
    cvy = hit[0].vy;
    balls[i] = hit[1];
  }

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      if (balls[i]!.pocketed || balls[j]!.pocketed) continue;
      const [a, b] = resolveBallCollision(balls[i]!, balls[j]!);
      balls[i] = a;
      balls[j] = b;
    }
  }

  const allMoving =
    Math.hypot(cvx, cvy) > MIN_SPEED ||
    balls.some((b) => !b.pocketed && Math.hypot(b.vx, b.vy) > MIN_SPEED);

  const score = state.score + scoreGain;
  const allPocketed = balls.every((b) => b.pocketed);
  const shots = state.shots;

  if (allMoving) {
    return {
      ...state,
      cueX,
      cueY,
      cueVx: cvx,
      cueVy: cvy,
      balls,
      score,
      lastPocketFlash,
      pocketPulse,
    };
  }

  return {
    ...state,
    cueX,
    cueY,
    cueVx: 0,
    cueVy: 0,
    balls,
    score,
    shots,
    lastPocketFlash,
    pocketPulse,
    status: allPocketed || shots >= MAX_SHOTS ? "over" : "aiming",
  };
}

export function computeScore(state: BilliardsState): number {
  return state.score;
}

export { W as BILLIARDS_W, H as BILLIARDS_H, BALL_R, POCKET_R };
