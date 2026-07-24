export const FIELD_W = 400;
export const FIELD_H = 240;
export const PADDLE_H = 56;
export const PADDLE_W = 10;
export const BALL_R = 8;
export const WIN_SCORE = 5;

export interface TableTennisState {
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  playerY: number;
  cpuY: number;
  playerScore: number;
  cpuScore: number;
  status: "playing" | "over";
  winner: "player" | "cpu" | null;
}

const CENTER_Y = FIELD_H / 2;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function createInitialState(): TableTennisState {
  return {
    ballX: FIELD_W / 2,
    ballY: CENTER_Y,
    ballVx: 180,
    ballVy: 60,
    playerY: CENTER_Y,
    cpuY: CENTER_Y,
    playerScore: 0,
    cpuScore: 0,
    status: "playing",
    winner: null,
  };
}

function resetBall(toPlayer: boolean): Pick<TableTennisState, "ballX" | "ballY" | "ballVx" | "ballVy"> {
  return {
    ballX: FIELD_W / 2,
    ballY: CENTER_Y,
    ballVx: toPlayer ? -180 : 180,
    ballVy: (Math.random() - 0.5) * 120,
  };
}

export function movePlayer(state: TableTennisState, y: number): TableTennisState {
  if (state.status !== "playing") return state;
  return {
    ...state,
    playerY: clamp(y, PADDLE_H / 2, FIELD_H - PADDLE_H / 2),
  };
}

export function step(state: TableTennisState, dt: number): TableTennisState {
  if (state.status !== "playing") return state;

  const cpuTarget = state.ballX > FIELD_W / 2 ? state.ballY : CENTER_Y;
  const cpuDy = clamp(cpuTarget - state.cpuY, -140 * dt, 140 * dt);
  const cpuY = clamp(state.cpuY + cpuDy, PADDLE_H / 2, FIELD_H - PADDLE_H / 2);

  let ballX = state.ballX + state.ballVx * dt;
  let ballY = state.ballY + state.ballVy * dt;
  let ballVx = state.ballVx;
  let ballVy = state.ballVy;

  if (ballY - BALL_R <= 0) {
    ballY = BALL_R;
    ballVy = Math.abs(ballVy);
  } else if (ballY + BALL_R >= FIELD_H) {
    ballY = FIELD_H - BALL_R;
    ballVy = -Math.abs(ballVy);
  }

  const playerX = 16;
  const cpuX = FIELD_W - 16;
  if (ballVx < 0 && ballX - BALL_R <= playerX + PADDLE_W / 2) {
    if (Math.abs(ballY - state.playerY) <= PADDLE_H / 2 + BALL_R) {
      ballX = playerX + PADDLE_W / 2 + BALL_R;
      ballVx = Math.abs(ballVx) * 1.05;
      ballVy += (ballY - state.playerY) * 2;
    }
  }
  if (ballVx > 0 && ballX + BALL_R >= cpuX - PADDLE_W / 2) {
    if (Math.abs(ballY - cpuY) <= PADDLE_H / 2 + BALL_R) {
      ballX = cpuX - PADDLE_W / 2 - BALL_R;
      ballVx = -Math.abs(ballVx) * 1.05;
      ballVy += (ballY - cpuY) * 2;
    }
  }

  let playerScore = state.playerScore;
  let cpuScore = state.cpuScore;
  let status: TableTennisState["status"] = state.status;
  let winner = state.winner;

  if (ballX < 0) {
    cpuScore += 1;
    ({ ballX, ballY, ballVx, ballVy } = resetBall(true));
  } else if (ballX > FIELD_W) {
    playerScore += 1;
    ({ ballX, ballY, ballVx, ballVy } = resetBall(false));
  }

  if (playerScore >= WIN_SCORE) {
    status = "over";
    winner = "player";
  } else if (cpuScore >= WIN_SCORE) {
    status = "over";
    winner = "cpu";
  }

  return {
    ...state,
    ballX,
    ballY,
    ballVx,
    ballVy,
    cpuY,
    playerScore,
    cpuScore,
    status,
    winner,
  };
}

export function computeScore(state: TableTennisState): number {
  return state.playerScore * 100 + (state.winner === "player" ? 200 : 0);
}
