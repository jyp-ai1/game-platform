// Original two-paddle real-time air-hockey game (puck + goals) — a generic,
// unbranded table-game format, not tied to any specific copyrighted
// game/franchise. No names/art/characters copied from anywhere.

export const FIELD_WIDTH = 400;
export const FIELD_HEIGHT = 600; // portrait table, goals on top & bottom
export const PADDLE_RADIUS = 28;
export const PUCK_RADIUS = 14;
export const GOAL_WIDTH = 140; // centered gap in the top/bottom walls
export const PLAYER_MAX_SPEED = 500; // px/sec, clamps pointer-driven movement
export const AI_MAX_SPEED = 220; // px/sec — deliberately slower than the player's cap, for a winnable difficulty
export const PUCK_FRICTION_PER_SEC_AT_60FPS = 0.995; // per-frame decay at a 60fps baseline, normalized to real dt in step()
export const PUCK_MAX_SPEED = 900;
export const MIN_HIT_SPEED = 200; // ensures a paddle hit never leaves the puck nearly stationary
export const HIT_BOUNCE_MULTIPLIER = 1.15;
export const WINNING_SCORE = 7;
export const RESET_DELAY_SECONDS = 1.2; // pause after a goal before the puck respawns

const CENTER_X = FIELD_WIDTH / 2;
const CENTER_Y = FIELD_HEIGHT / 2;

export interface Vec2 {
  x: number;
  y: number;
}

export type Status = "playing" | "over";
export type Winner = "player" | "ai" | null;

export interface AirHockeyState {
  playerPaddle: Vec2; // bottom half of the table
  aiPaddle: Vec2; // top half of the table
  puck: Vec2;
  puckVelocity: Vec2;
  playerScore: number;
  aiScore: number;
  status: Status;
  winner: Winner;
  resetTimer: number; // seconds remaining before the puck respawns after a goal; 0 = active play
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampSpeed(v: Vec2, maxSpeed: number): Vec2 {
  const speed = Math.hypot(v.x, v.y);
  if (speed <= maxSpeed || speed === 0) {
    return v;
  }
  const scale = maxSpeed / speed;
  return { x: v.x * scale, y: v.y * scale };
}

export function createInitialState(): AirHockeyState {
  return {
    playerPaddle: { x: CENTER_X, y: FIELD_HEIGHT - 80 },
    aiPaddle: { x: CENTER_X, y: 80 },
    puck: { x: CENTER_X, y: CENTER_Y },
    puckVelocity: { x: 0, y: 0 },
    playerScore: 0,
    aiScore: 0,
    status: "playing",
    winner: null,
    resetTimer: 0,
  };
}

// Player paddle is confined to their own half of the table (a standard
// air-hockey rule — prevents parking on the opponent's goal mouth).
export function movePlayerPaddle(
  state: AirHockeyState,
  target: Vec2
): AirHockeyState {
  if (state.status !== "playing") {
    return state;
  }
  const x = clamp(target.x, PADDLE_RADIUS, FIELD_WIDTH - PADDLE_RADIUS);
  const y = clamp(
    target.y,
    CENTER_Y + PADDLE_RADIUS,
    FIELD_HEIGHT - PADDLE_RADIUS
  );
  return { ...state, playerPaddle: { x, y } };
}

function isInGoalRange(x: number): boolean {
  return x > CENTER_X - GOAL_WIDTH / 2 && x < CENTER_X + GOAL_WIDTH / 2;
}

function resolvePaddleCollision(puck: Vec2, velocity: Vec2, paddle: Vec2): Vec2 | null {
  const dx = puck.x - paddle.x;
  const dy = puck.y - paddle.y;
  const dist = Math.hypot(dx, dy);
  const minDist = PUCK_RADIUS + PADDLE_RADIUS;
  if (dist >= minDist || dist === 0) {
    return null;
  }
  const nx = dx / dist;
  const ny = dy / dist;
  puck.x = paddle.x + nx * minDist;
  puck.y = paddle.y + ny * minDist;
  const speed = Math.max(Math.hypot(velocity.x, velocity.y), MIN_HIT_SPEED);
  return clampSpeed(
    { x: nx * speed * HIT_BOUNCE_MULTIPLIER, y: ny * speed * HIT_BOUNCE_MULTIPLIER },
    PUCK_MAX_SPEED
  );
}

export function step(state: AirHockeyState, dtSeconds: number): AirHockeyState {
  if (state.status !== "playing") {
    return state;
  }

  // Reset countdown after a goal — puck stays parked at center until it elapses.
  if (state.resetTimer > 0) {
    const resetTimer = state.resetTimer - dtSeconds;
    if (resetTimer > 0) {
      return { ...state, resetTimer };
    }
    return {
      ...state,
      puck: { x: CENTER_X, y: CENTER_Y },
      puckVelocity: { x: 0, y: 0 },
      resetTimer: 0,
    };
  }

  // --- AI paddle: simple pursuit, retreats to a home defensive position
  // when the puck is in the player's half. ---
  const aiTargetX = state.puck.y < CENTER_Y ? state.puck.x : CENTER_X;
  const aiDx = clamp(aiTargetX - state.aiPaddle.x, -AI_MAX_SPEED * dtSeconds, AI_MAX_SPEED * dtSeconds);
  const aiX = clamp(state.aiPaddle.x + aiDx, PADDLE_RADIUS, FIELD_WIDTH - PADDLE_RADIUS);

  const aiTargetY =
    state.puck.y < CENTER_Y && state.puck.y < 140
      ? Math.min(state.puck.y, CENTER_Y - PADDLE_RADIUS)
      : 80;
  const aiDy = clamp(aiTargetY - state.aiPaddle.y, -AI_MAX_SPEED * dtSeconds, AI_MAX_SPEED * dtSeconds);
  const aiY = clamp(state.aiPaddle.y + aiDy, PADDLE_RADIUS, CENTER_Y - PADDLE_RADIUS);
  const aiPaddle: Vec2 = { x: aiX, y: aiY };

  // --- Puck integration ---
  let puck: Vec2 = {
    x: state.puck.x + state.puckVelocity.x * dtSeconds,
    y: state.puck.y + state.puckVelocity.y * dtSeconds,
  };
  const frictionFactor = Math.pow(PUCK_FRICTION_PER_SEC_AT_60FPS, dtSeconds * 60);
  let velocity: Vec2 = {
    x: state.puckVelocity.x * frictionFactor,
    y: state.puckVelocity.y * frictionFactor,
  };

  // Side walls.
  if (puck.x - PUCK_RADIUS < 0) {
    puck = { ...puck, x: PUCK_RADIUS };
    velocity = { ...velocity, x: Math.abs(velocity.x) };
  } else if (puck.x + PUCK_RADIUS > FIELD_WIDTH) {
    puck = { ...puck, x: FIELD_WIDTH - PUCK_RADIUS };
    velocity = { ...velocity, x: -Math.abs(velocity.x) };
  }

  // Top/bottom: goal or wall bounce.
  let playerScore = state.playerScore;
  let aiScore = state.aiScore;
  let resetTimer = 0;
  let scored = false;

  if (puck.y - PUCK_RADIUS < 0) {
    if (isInGoalRange(puck.x)) {
      playerScore += 1;
      scored = true;
    } else {
      puck = { ...puck, y: PUCK_RADIUS };
      velocity = { ...velocity, y: Math.abs(velocity.y) };
    }
  } else if (puck.y + PUCK_RADIUS > FIELD_HEIGHT) {
    if (isInGoalRange(puck.x)) {
      aiScore += 1;
      scored = true;
    } else {
      puck = { ...puck, y: FIELD_HEIGHT - PUCK_RADIUS };
      velocity = { ...velocity, y: -Math.abs(velocity.y) };
    }
  }

  if (scored) {
    resetTimer = RESET_DELAY_SECONDS;
    puck = { x: CENTER_X, y: CENTER_Y };
    velocity = { x: 0, y: 0 };
  } else {
    // Paddle collisions only matter when the puck is still in open play.
    const hitPlayer = resolvePaddleCollision(puck, velocity, state.playerPaddle);
    if (hitPlayer) {
      velocity = hitPlayer;
    } else {
      const hitAi = resolvePaddleCollision(puck, velocity, aiPaddle);
      if (hitAi) {
        velocity = hitAi;
      }
    }
  }

  let status: Status = state.status;
  let winner: Winner = state.winner;
  if (playerScore >= WINNING_SCORE) {
    status = "over";
    winner = "player";
  } else if (aiScore >= WINNING_SCORE) {
    status = "over";
    winner = "ai";
  }

  return {
    ...state,
    aiPaddle,
    puck,
    puckVelocity: velocity,
    playerScore,
    aiScore,
    status,
    winner,
    resetTimer,
  };
}
