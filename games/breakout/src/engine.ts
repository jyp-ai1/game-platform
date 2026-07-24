export const FIELD_WIDTH = 400;
export const FIELD_HEIGHT = 300;
export const PADDLE_WIDTH = 70;
export const PADDLE_HEIGHT = 10;
export const PADDLE_Y = FIELD_HEIGHT - 20;
export const BALL_SIZE = 10;
export const BRICK_ROWS = 4;
export const BRICK_COLS = 7;
export const BRICK_WIDTH = 50;
export const BRICK_HEIGHT = 16;
export const BRICK_GAP = 6;
export const BRICK_TOP_OFFSET = 30;
export const BALL_SPEED = 200;
export const POINTS_PER_BRICK = 10;
export const STARTING_LIVES = 3;

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Status = "playing" | "over" | "won";

export interface BreakoutState {
  paddleX: number;
  ball: Ball;
  bricks: boolean[];
  score: number;
  lives: number;
  status: Status;
}

export function createInitialBricks(): boolean[] {
  return Array<boolean>(BRICK_ROWS * BRICK_COLS).fill(true);
}

export function createInitialBall(): Ball {
  return {
    x: FIELD_WIDTH / 2,
    y: PADDLE_Y - BALL_SIZE,
    vx: BALL_SPEED * 0.5,
    vy: -BALL_SPEED * 0.85,
  };
}

export function createInitialState(): BreakoutState {
  return {
    paddleX: FIELD_WIDTH / 2 - PADDLE_WIDTH / 2,
    ball: createInitialBall(),
    bricks: createInitialBricks(),
    score: 0,
    lives: STARTING_LIVES,
    status: "playing",
  };
}

export function brickRect(index: number): Rect {
  const row = Math.floor(index / BRICK_COLS);
  const col = index % BRICK_COLS;
  const totalWidth = BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_GAP;
  const startX = (FIELD_WIDTH - totalWidth) / 2;
  return {
    x: startX + col * (BRICK_WIDTH + BRICK_GAP),
    y: BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_GAP),
    width: BRICK_WIDTH,
    height: BRICK_HEIGHT,
  };
}

function circleRectIntersect(
  cx: number,
  cy: number,
  radius: number,
  rect: Rect
): boolean {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

export function step(state: BreakoutState, dtSeconds: number): BreakoutState {
  if (state.status !== "playing") {
    return state;
  }

  let { x, y, vx, vy } = state.ball;
  x += vx * dtSeconds;
  y += vy * dtSeconds;

  const radius = BALL_SIZE / 2;

  if (x - radius < 0) {
    x = radius;
    vx = Math.abs(vx);
  } else if (x + radius > FIELD_WIDTH) {
    x = FIELD_WIDTH - radius;
    vx = -Math.abs(vx);
  }
  if (y - radius < 0) {
    y = radius;
    vy = Math.abs(vy);
  }

  const paddleRect: Rect = {
    x: state.paddleX,
    y: PADDLE_Y,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  };
  if (vy > 0 && circleRectIntersect(x, y, radius, paddleRect)) {
    // Where the ball hit the paddle (-1 left edge .. 1 right edge) steers
    // the rebound angle so the player has some control over aim.
    const hitPos = (x - (state.paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
    const speed = Math.hypot(vx, vy);
    vx = hitPos * speed;
    vy = -Math.abs(vy);
    y = PADDLE_Y - radius;
  }

  let bricks = state.bricks;
  let score = state.score;
  let brickHitIndex = -1;
  for (let i = 0; i < bricks.length; i++) {
    if (!bricks[i]) {
      continue;
    }
    if (circleRectIntersect(x, y, radius, brickRect(i))) {
      brickHitIndex = i;
      break;
    }
  }
  if (brickHitIndex >= 0) {
    bricks = bricks.slice();
    bricks[brickHitIndex] = false;
    score += POINTS_PER_BRICK;
    vy = -vy;
  }

  if (y - radius > FIELD_HEIGHT) {
    const lives = state.lives - 1;
    if (lives <= 0) {
      return { ...state, ball: { x, y, vx, vy }, bricks, score, lives, status: "over" };
    }
    return { ...state, ball: createInitialBall(), bricks, score, lives, status: "playing" };
  }

  const status: Status = bricks.some(Boolean) ? "playing" : "won";

  return { ...state, ball: { x, y, vx, vy }, bricks, score, status };
}
