// Starts from Breakout's engine shape (paddle + ball + bricks) but is not a
// reskin: multi-stage progression (3 brick layouts cleared in sequence) and
// 2 power-ups (paddle-widen, multi-ball) that drop from specific bricks give
// this a genuinely different moment-to-moment feel.
export const FIELD_WIDTH = 400;
export const FIELD_HEIGHT = 300;
export const PADDLE_WIDTH_BASE = 60;
export const PADDLE_WIDTH_WIDE = 100;
export const PADDLE_WIDEN_DURATION_S = 8;
export const PADDLE_HEIGHT = 10;
export const PADDLE_Y = FIELD_HEIGHT - 20;
export const BALL_SIZE = 10;
export const BRICK_ROWS = 5;
export const BRICK_COLS = 7;
export const BRICK_WIDTH = 50;
export const BRICK_HEIGHT = 14;
export const BRICK_GAP = 5;
export const BRICK_TOP_OFFSET = 24;
export const BALL_SPEED = 200;
export const POINTS_PER_BRICK = 10;
export const STAGE_CLEAR_BONUS = 50;
export const STARTING_LIVES = 3;
export const CAPSULE_SIZE = 16;
export const CAPSULE_SPEED = 90;

// Row-major "X"=alive "."=empty patterns, BRICK_ROWS x BRICK_COLS each. Row 1
// col 3 and row 3 col 3 (flat indices 10 and 24) are kept alive in every
// pattern -- those are the two designated power-up bricks, so both power-ups
// are obtainable on every stage regardless of layout.
const STAGE_PATTERNS: readonly string[][] = [
  ["XXXXXXX", "XXXXXXX", "XXXXXXX", "XXXXXXX", "XXXXXXX"],
  ["..XXX..", ".XXXXX.", "XXXXXXX", ".XXXXX.", "..XXX.."],
  ["X.X.X.X", "XXXXXXX", "X.X.X.X", "XXXXXXX", "X.X.X.X"],
];

export const STAGE_COUNT = STAGE_PATTERNS.length;

export const POWER_BRICK_KIND: Record<number, "widen" | "multiball"> = {
  10: "widen",
  24: "multiball",
};

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Capsule {
  x: number;
  y: number;
  kind: "widen" | "multiball";
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Status = "playing" | "over" | "won";

export interface ArkanoidState {
  paddleX: number;
  paddleWidth: number;
  widenTimer: number;
  balls: Ball[];
  bricks: boolean[];
  capsules: Capsule[];
  stage: number;
  score: number;
  lives: number;
  status: Status;
}

export function createBricksForStage(stage: number): boolean[] {
  const pattern = STAGE_PATTERNS[stage] ?? STAGE_PATTERNS[0]!;
  return pattern.flatMap((row) => row.split("").map((ch) => ch === "X"));
}

export function createInitialBall(): Ball {
  return {
    x: FIELD_WIDTH / 2,
    y: PADDLE_Y - BALL_SIZE,
    vx: BALL_SPEED * 0.5,
    vy: -BALL_SPEED * 0.85,
  };
}

export function createInitialState(): ArkanoidState {
  return {
    paddleX: FIELD_WIDTH / 2 - PADDLE_WIDTH_BASE / 2,
    paddleWidth: PADDLE_WIDTH_BASE,
    widenTimer: 0,
    balls: [createInitialBall()],
    bricks: createBricksForStage(0),
    capsules: [],
    stage: 0,
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

function stepBall(
  ball: Ball,
  dtSeconds: number,
  paddleRect: Rect
): { ball: Ball | null; brickHitIndex: number } {
  let { x, y, vx, vy } = ball;
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

  if (vy > 0 && circleRectIntersect(x, y, radius, paddleRect)) {
    const hitPos = (x - (paddleRect.x + paddleRect.width / 2)) / (paddleRect.width / 2);
    const speed = Math.hypot(vx, vy);
    vx = hitPos * speed;
    vy = -Math.abs(vy);
    y = paddleRect.y - radius;
  }

  if (y - radius > FIELD_HEIGHT) {
    return { ball: null, brickHitIndex: -1 };
  }

  return { ball: { x, y, vx, vy }, brickHitIndex: -1 };
}

export function step(state: ArkanoidState, dtSeconds: number): ArkanoidState {
  if (state.status !== "playing") {
    return state;
  }

  const widenTimer = Math.max(0, state.widenTimer - dtSeconds);
  const paddleWidth = widenTimer > 0 ? PADDLE_WIDTH_WIDE : PADDLE_WIDTH_BASE;
  const paddleX = Math.min(state.paddleX, FIELD_WIDTH - paddleWidth);
  const paddleRect: Rect = { x: paddleX, y: PADDLE_Y, width: paddleWidth, height: PADDLE_HEIGHT };

  let bricks = state.bricks;
  let score = state.score;
  const capsules: Capsule[] = [];
  const survivingBalls: Ball[] = [];

  for (const ball of state.balls) {
    const { ball: moved } = stepBall(ball, dtSeconds, paddleRect);
    if (!moved) {
      continue;
    }

    const radius = BALL_SIZE / 2;
    let brickHitIndex = -1;
    for (let i = 0; i < bricks.length; i++) {
      if (!bricks[i]) {
        continue;
      }
      if (circleRectIntersect(moved.x, moved.y, radius, brickRect(i))) {
        brickHitIndex = i;
        break;
      }
    }

    if (brickHitIndex >= 0) {
      if (bricks === state.bricks) {
        bricks = state.bricks.slice();
      }
      bricks[brickHitIndex] = false;
      score += POINTS_PER_BRICK;
      moved.vy = -moved.vy;

      const kind = POWER_BRICK_KIND[brickHitIndex];
      if (kind) {
        const rect = brickRect(brickHitIndex);
        capsules.push({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, kind });
      }
    }

    survivingBalls.push(moved);
  }

  // Capsules fall and can be caught by the paddle -- independent of which
  // ball spawned them.
  const nextCapsules: Capsule[] = [];
  let nextWidenTimer = widenTimer;
  let spawnMultiball = false;
  for (const capsule of [...state.capsules, ...capsules]) {
    const y = capsule.y + CAPSULE_SPEED * dtSeconds;
    if (y > FIELD_HEIGHT) {
      continue;
    }
    const caught =
      y + CAPSULE_SIZE / 2 >= paddleRect.y &&
      capsule.x >= paddleRect.x &&
      capsule.x <= paddleRect.x + paddleRect.width;
    if (caught) {
      if (capsule.kind === "widen") {
        nextWidenTimer = PADDLE_WIDEN_DURATION_S;
      } else {
        spawnMultiball = true;
      }
      continue;
    }
    nextCapsules.push({ ...capsule, y });
  }

  // Catching a widen capsule this frame must widen the paddle this same
  // frame, not the next one -- otherwise there's a one-frame lag where
  // `paddleWidth` (derived from the pre-catch widenTimer above) still
  // reports the old width even though nextWidenTimer already reflects the
  // catch.
  const finalPaddleWidth = nextWidenTimer > 0 ? PADDLE_WIDTH_WIDE : PADDLE_WIDTH_BASE;

  let balls = survivingBalls;
  if (spawnMultiball && balls.length > 0) {
    const source = balls[0]!;
    const speed = Math.hypot(source.vx, source.vy);
    balls = [
      source,
      { ...source, vx: -speed * 0.6, vy: -Math.abs(source.vy) },
      { ...source, vx: speed * 0.6, vy: -Math.abs(source.vy) },
    ];
  }

  if (balls.length === 0) {
    const lives = state.lives - 1;
    if (lives <= 0) {
      return {
        ...state,
        paddleX,
        paddleWidth: finalPaddleWidth,
        widenTimer: nextWidenTimer,
        balls: [],
        bricks,
        capsules: nextCapsules,
        score,
        lives,
        status: "over",
      };
    }
    return {
      ...state,
      paddleX,
      paddleWidth: PADDLE_WIDTH_BASE,
      widenTimer: 0,
      balls: [createInitialBall()],
      bricks,
      capsules: [],
      score,
      lives,
      status: "playing",
    };
  }

  if (!bricks.some(Boolean)) {
    const nextStage = state.stage + 1;
    if (nextStage >= STAGE_COUNT) {
      return {
        ...state,
        paddleX,
        paddleWidth: finalPaddleWidth,
        widenTimer: nextWidenTimer,
        balls,
        bricks,
        capsules: nextCapsules,
        score: score + STAGE_CLEAR_BONUS,
        status: "won",
      };
    }
    return {
      ...state,
      paddleX,
      paddleWidth: PADDLE_WIDTH_BASE,
      widenTimer: 0,
      balls: [createInitialBall()],
      bricks: createBricksForStage(nextStage),
      capsules: [],
      stage: nextStage,
      score: score + STAGE_CLEAR_BONUS,
      status: "playing",
    };
  }

  return {
    ...state,
    paddleX,
    paddleWidth: finalPaddleWidth,
    widenTimer: nextWidenTimer,
    balls,
    bricks,
    capsules: nextCapsules,
    score,
  };
}
