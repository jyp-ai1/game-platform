export const FIELD_WIDTH = 400;
export const FIELD_HEIGHT = 500;
export const INVADER_ROWS = 4;
export const INVADER_COLS = 8;
export const PLAYER_Y = FIELD_HEIGHT - 30;

export const INVADER_CELL_WIDTH = 32;
export const INVADER_CELL_HEIGHT = 24;
export const INVADER_SIZE = 20;
export const INVADER_GRID_STEP_DISTANCE = 10;
export const INVADER_ROW_DESCENT = 20;
export const INVADER_BASE_STEP_INTERVAL_MS = 800;
export const INVADER_MIN_STEP_INTERVAL_MS = 80;

export const PLAYER_WIDTH = 30;
export const PLAYER_HEIGHT = 14;
export const PLAYER_SPEED = 220;

export const BULLET_WIDTH = 3;
export const BULLET_HEIGHT = 10;
export const PLAYER_BULLET_SPEED = -320; // moves upward (negative y)
export const INVADER_BULLET_SPEED = 200; // moves downward (positive y)
export const PLAYER_FIRE_COOLDOWN_MS = 400;

export const SHIELD_WIDTH = 40;
export const SHIELD_HEIGHT = 20;
export const SHIELD_STARTING_HP = 4;
export const SHIELD_COUNT = 4;
export const SHIELD_Y = Math.round((FIELD_HEIGHT * 2) / 3);

export const STARTING_LIVES = 3;
export const POINTS_PER_INVADER = 20;

// Probability (per grid-step tick) that the invaders fire a bullet. See
// step() docs below for how this is applied.
export const INVADER_FIRE_CHANCE_PER_TICK = 0.5;

export type Status = "playing" | "over" | "won";

export interface InvaderGrid {
  alive: boolean[][]; // [row][col], row 0 = frontmost/topmost row
  originX: number; // x of the top-left corner of the formation block
  originY: number; // y of the top-left corner of the formation block
  direction: 1 | -1; // current horizontal marching direction
}

export interface Shield {
  x: number;
  y: number;
  hp: number;
}

export interface Bullet {
  x: number;
  y: number;
  vy: number;
  owner: "player" | "invader";
}

export interface SpaceDefenderState {
  playerX: number; // y is fixed at PLAYER_Y (left edge of player ship)
  playerCooldown: number;
  invaders: InvaderGrid;
  shields: Shield[];
  bullets: Bullet[];
  score: number;
  lives: number;
  invaderMoveAccumulatorMs: number;
  status: Status;
}

function createInitialAlive(): boolean[][] {
  return Array.from({ length: INVADER_ROWS }, () =>
    Array<boolean>(INVADER_COLS).fill(true)
  );
}

function invaderFormationWidth(): number {
  return INVADER_COLS * INVADER_CELL_WIDTH;
}

export function createInitialState(): SpaceDefenderState {
  const formationWidth = invaderFormationWidth();
  const originX = (FIELD_WIDTH - formationWidth) / 2;
  const originY = 40;

  const shields: Shield[] = [];
  const gap = FIELD_WIDTH / (SHIELD_COUNT + 1);
  for (let i = 0; i < SHIELD_COUNT; i++) {
    shields.push({
      x: gap * (i + 1) - SHIELD_WIDTH / 2,
      y: SHIELD_Y,
      hp: SHIELD_STARTING_HP,
    });
  }

  return {
    playerX: FIELD_WIDTH / 2 - PLAYER_WIDTH / 2,
    playerCooldown: 0,
    invaders: {
      alive: createInitialAlive(),
      originX,
      originY,
      direction: 1,
    },
    shields,
    bullets: [],
    score: 0,
    lives: STARTING_LIVES,
    invaderMoveAccumulatorMs: 0,
    status: "playing",
  };
}

export function setPlayerX(
  state: SpaceDefenderState,
  x: number
): SpaceDefenderState {
  const clamped = Math.max(0, Math.min(FIELD_WIDTH - PLAYER_WIDTH, x));
  if (clamped === state.playerX) {
    return state;
  }
  return { ...state, playerX: clamped };
}

/** Screen-space rect for a given invader grid cell. */
export function invaderCellRect(grid: InvaderGrid, row: number, col: number) {
  return {
    x: grid.originX + col * INVADER_CELL_WIDTH + (INVADER_CELL_WIDTH - INVADER_SIZE) / 2,
    y: grid.originY + row * INVADER_CELL_HEIGHT + (INVADER_CELL_HEIGHT - INVADER_SIZE) / 2,
    width: INVADER_SIZE,
    height: INVADER_SIZE,
  };
}

export function firePlayerBullet(
  state: SpaceDefenderState
): SpaceDefenderState {
  if (state.status !== "playing") {
    return state;
  }
  if (state.playerCooldown > 0) {
    return state;
  }
  const hasPlayerBullet = state.bullets.some((b) => b.owner === "player");
  if (hasPlayerBullet) {
    return state;
  }
  const bullet: Bullet = {
    x: state.playerX + PLAYER_WIDTH / 2,
    y: PLAYER_Y,
    vy: PLAYER_BULLET_SPEED,
    owner: "player",
  };
  return {
    ...state,
    bullets: [...state.bullets, bullet],
    playerCooldown: PLAYER_FIRE_COOLDOWN_MS,
  };
}

function countAlive(alive: boolean[][]): number {
  let count = 0;
  for (const row of alive) {
    for (const cell of row) {
      if (cell) {
        count++;
      }
    }
  }
  return count;
}

function cloneAlive(alive: boolean[][]): boolean[][] {
  return alive.map((row) => row.slice());
}

/** Simple aabb overlap test. */
function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Finds, per column, the bottom-most alive row (the "front line" facing the
// player) so invader fire always originates from the lowest surviving
// invader in a column, mirroring the classic front-line-fires convention.
function frontLineCellsByColumn(alive: boolean[][]): number[] {
  const result: number[] = [];
  for (let col = 0; col < INVADER_COLS; col++) {
    let bottomRow = -1;
    for (let row = 0; row < INVADER_ROWS; row++) {
      if (alive[row]![col]) {
        bottomRow = row;
      }
    }
    if (bottomRow >= 0) {
      result.push(bottomRow * 1000 + col); // encode row+col, decoded below
    }
  }
  return result;
}

export function step(
  state: SpaceDefenderState,
  dtSeconds: number
): SpaceDefenderState {
  if (state.status !== "playing") {
    return state;
  }

  const dtMs = dtSeconds * 1000;

  // (1) Cooldown.
  const playerCooldown = Math.max(0, state.playerCooldown - dtMs);

  // (2) Core mechanic: grid march speed scales with remaining invaders.
  let alive = state.invaders.alive;
  let originX = state.invaders.originX;
  let originY = state.invaders.originY;
  let direction = state.invaders.direction;
  let invaderMoveAccumulatorMs = state.invaderMoveAccumulatorMs + dtMs;
  let bullets = state.bullets.slice();
  let status: Status = state.status;

  const totalCount = INVADER_ROWS * INVADER_COLS;
  const aliveCountBeforeMove = countAlive(alive);
  const stepIntervalMs = Math.max(
    INVADER_MIN_STEP_INTERVAL_MS,
    INVADER_BASE_STEP_INTERVAL_MS * (aliveCountBeforeMove / totalCount)
  );

  while (invaderMoveAccumulatorMs >= stepIntervalMs && status === "playing") {
    invaderMoveAccumulatorMs -= stepIntervalMs;

    // Determine the current occupied column range among alive invaders.
    let minCol = INVADER_COLS;
    let maxCol = -1;
    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLS; col++) {
        if (alive[row]![col]) {
          if (col < minCol) minCol = col;
          if (col > maxCol) maxCol = col;
        }
      }
    }

    if (maxCol >= 0) {
      const leftEdge =
        originX + minCol * INVADER_CELL_WIDTH + direction * INVADER_GRID_STEP_DISTANCE;
      const rightEdge =
        originX +
        (maxCol + 1) * INVADER_CELL_WIDTH +
        direction * INVADER_GRID_STEP_DISTANCE;

      const wouldHitEdge = leftEdge < 0 || rightEdge > FIELD_WIDTH;

      if (wouldHitEdge) {
        direction = direction === 1 ? -1 : 1;
        originY += INVADER_ROW_DESCENT;
      } else {
        originX += direction * INVADER_GRID_STEP_DISTANCE;
      }
    }

    // Check if invaders reached the shields' defensive line.
    let maxRowWithAlive = -1;
    for (let row = INVADER_ROWS - 1; row >= 0; row--) {
      if (alive[row]!.some(Boolean)) {
        maxRowWithAlive = row;
        break;
      }
    }
    if (maxRowWithAlive >= 0) {
      const frontY = originY + maxRowWithAlive * INVADER_CELL_HEIGHT + INVADER_CELL_HEIGHT;
      if (frontY >= SHIELD_Y) {
        status = "over";
        break;
      }
    }

    // (3) Invader fire: tied to the same grid-step tick. Roll once per
    // tick; on success, pick a random alive front-line column and fire.
    if (Math.random() < INVADER_FIRE_CHANCE_PER_TICK) {
      const frontLine = frontLineCellsByColumn(alive);
      if (frontLine.length > 0) {
        const encoded = frontLine[Math.floor(Math.random() * frontLine.length)]!;
        const row = Math.floor(encoded / 1000);
        const col = encoded % 1000;
        const rect = invaderCellRect(
          { alive, originX, originY, direction },
          row,
          col
        );
        bullets.push({
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height,
          vy: INVADER_BULLET_SPEED,
          owner: "invader",
        });
      }
    }
  }

  // (4) Advance bullets, resolve collisions.
  let shields = state.shields;
  let score = state.score;
  let lives = state.lives;
  let shieldsCopied = false;
  let aliveCopied = false;

  const survivingBullets: Bullet[] = [];

  for (const bullet of bullets) {
    let x = bullet.x;
    let y = bullet.y + bullet.vy * dtSeconds;

    if (y < -BULLET_HEIGHT || y > FIELD_HEIGHT + BULLET_HEIGHT) {
      continue; // left the field
    }

    const bx = x - BULLET_WIDTH / 2;
    const by = y - BULLET_HEIGHT / 2;

    // Bullet vs shields (either owner can hit a shield).
    let consumed = false;
    for (let i = 0; i < shields.length; i++) {
      const shield = shields[i]!;
      if (shield.hp <= 0) {
        continue;
      }
      if (
        overlaps(bx, by, BULLET_WIDTH, BULLET_HEIGHT, shield.x, shield.y, SHIELD_WIDTH, SHIELD_HEIGHT)
      ) {
        if (!shieldsCopied) {
          shields = shields.map((s) => ({ ...s }));
          shieldsCopied = true;
        }
        shields[i]!.hp -= 1;
        consumed = true;
        break;
      }
    }
    if (consumed) {
      continue;
    }

    if (bullet.owner === "invader") {
      // Bullet vs player.
      if (
        overlaps(
          bx,
          by,
          BULLET_WIDTH,
          BULLET_HEIGHT,
          state.playerX,
          PLAYER_Y,
          PLAYER_WIDTH,
          PLAYER_HEIGHT
        )
      ) {
        lives -= 1;
        if (lives <= 0) {
          status = "over";
        }
        continue;
      }
    } else {
      // Bullet vs invaders.
      let hit = false;
      for (let row = 0; row < INVADER_ROWS && !hit; row++) {
        for (let col = 0; col < INVADER_COLS && !hit; col++) {
          if (!alive[row]![col]) {
            continue;
          }
          const rect = invaderCellRect({ alive, originX, originY, direction }, row, col);
          if (overlaps(bx, by, BULLET_WIDTH, BULLET_HEIGHT, rect.x, rect.y, rect.width, rect.height)) {
            if (!aliveCopied) {
              alive = cloneAlive(alive);
              aliveCopied = true;
            }
            alive[row]![col] = false;
            score += POINTS_PER_INVADER;
            hit = true;
          }
        }
      }
      if (hit) {
        continue;
      }
    }

    survivingBullets.push({ x, y, vy: bullet.vy, owner: bullet.owner });
  }

  // Remove fully-destroyed shields.
  if (shields.some((s) => s.hp <= 0)) {
    shields = shields.filter((s) => s.hp > 0);
  }

  // (5) Win condition.
  if (status === "playing" && countAlive(alive) === 0) {
    status = "won";
  }

  return {
    ...state,
    playerCooldown,
    invaders: { alive, originX, originY, direction },
    shields,
    bullets: survivingBullets,
    score,
    lives,
    invaderMoveAccumulatorMs,
    status,
  };
}
