// Original top-down grid-combat game: grid-aligned tank movement, single
// projectile in flight per side, and destructible terrain. Inspired only by
// the general "destructible terrain + grid tanks" mechanic shared by many
// classic arcade games — no copyrighted names, characters, maps, or UI are
// reused here. All identifiers below are generic on purpose.

export const GRID_SIZE = 13; // 13x13 tile grid
export const TILE_SIZE = 1; // logical units; rendering maps this to pixels/percent

export const BULLET_SPEED = 6; // tiles per second
export const PLAYER_FIRE_COOLDOWN = 0.4; // seconds
export const ENEMY_MOVE_INTERVAL = 0.5; // seconds between enemy move decisions
export const ENEMY_FIRE_COOLDOWN = 1.2; // seconds
export const POINTS_PER_ENEMY = 100;
export const ENEMIES_TOTAL = 5;

export type TileType = "empty" | "brick" | "steel" | "water";
export type Facing = "up" | "down" | "left" | "right";
export type Status = "playing" | "over" | "won";

export interface Bullet {
  x: number;
  y: number;
  facing: Facing;
  owner: "player" | "enemy";
}

export interface EnemyTank {
  x: number;
  y: number;
  facing: Facing;
  cooldown: number; // seconds until it can fire again
  moveTimer: number; // seconds until its next move decision
}

export interface TankState {
  grid: TileType[][]; // [row][col], GRID_SIZE x GRID_SIZE
  playerX: number;
  playerY: number;
  playerFacing: Facing;
  playerCooldown: number;
  enemy: EnemyTank | null;
  bullets: Bullet[];
  score: number;
  enemiesDefeated: number;
  enemiesTotal: number;
  status: Status;
}

const DELTAS: Record<Facing, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const PLAYER_SPAWN = { x: Math.floor(GRID_SIZE / 2), y: GRID_SIZE - 2 };
const ENEMY_SPAWN = { x: Math.floor(GRID_SIZE / 2), y: 1 };

function createInitialGrid(): TileType[][] {
  const grid: TileType[][] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const line: TileType[] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      const isBorder =
        row === 0 || col === 0 || row === GRID_SIZE - 1 || col === GRID_SIZE - 1;
      line.push(isBorder ? "steel" : "empty");
    }
    grid.push(line);
  }

  // Hand-designed, symmetric original layout: brick clusters flanking the
  // center, plus a couple of water tiles for terrain variety.
  const brickCells: Array<[number, number]> = [
    [3, 3], [3, 4], [4, 3],
    [3, 8], [3, 9], [4, 9],
    [8, 3], [9, 3], [9, 4],
    [8, 9], [9, 9], [9, 8],
    [6, 3], [6, 9],
    [5, 6], [7, 6],
  ];
  for (const [row, col] of brickCells) {
    grid[row]![col] = "brick";
  }

  const waterCells: Array<[number, number]> = [
    [6, 5],
    [6, 7],
  ];
  for (const [row, col] of waterCells) {
    grid[row]![col] = "water";
  }

  return grid;
}

function createEnemy(): EnemyTank {
  return {
    x: ENEMY_SPAWN.x,
    y: ENEMY_SPAWN.y,
    facing: "down",
    cooldown: ENEMY_FIRE_COOLDOWN,
    moveTimer: ENEMY_MOVE_INTERVAL,
  };
}

export function createInitialState(): TankState {
  return {
    grid: createInitialGrid(),
    playerX: PLAYER_SPAWN.x,
    playerY: PLAYER_SPAWN.y,
    playerFacing: "up",
    playerCooldown: 0,
    enemy: createEnemy(),
    bullets: [],
    score: 0,
    enemiesDefeated: 0,
    enemiesTotal: ENEMIES_TOTAL,
    status: "playing",
  };
}

function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

function isPassable(
  grid: TileType[][],
  x: number,
  y: number,
  occupiedX: number,
  occupiedY: number
): boolean {
  if (!inBounds(x, y)) {
    return false;
  }
  const tile = grid[y]![x];
  if (tile === "brick" || tile === "steel" || tile === "water") {
    return false;
  }
  if (x === occupiedX && y === occupiedY) {
    return false;
  }
  return true;
}

export function move(state: TankState, dir: Facing): TankState {
  if (state.status !== "playing") {
    return state;
  }
  const delta = DELTAS[dir];
  const nextX = state.playerX + delta.dx;
  const nextY = state.playerY + delta.dy;

  const enemyX = state.enemy?.x ?? -1;
  const enemyY = state.enemy?.y ?? -1;

  if (isPassable(state.grid, nextX, nextY, enemyX, enemyY)) {
    return { ...state, playerX: nextX, playerY: nextY, playerFacing: dir };
  }
  return { ...state, playerFacing: dir };
}

export function fire(state: TankState): TankState {
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
    x: state.playerX,
    y: state.playerY,
    facing: state.playerFacing,
    owner: "player",
  };
  return {
    ...state,
    bullets: [...state.bullets, bullet],
    playerCooldown: PLAYER_FIRE_COOLDOWN,
  };
}

function fireFrom(x: number, y: number, facing: Facing, owner: "player" | "enemy"): Bullet {
  return { x, y, facing, owner };
}

function pickEnemyDirection(state: TankState, enemy: EnemyTank): Facing {
  const dx = state.playerX - enemy.x;
  const dy = state.playerY - enemy.y;
  const preferHorizontal = Math.abs(dx) >= Math.abs(dy);

  const horizontal: Facing = dx < 0 ? "left" : "right";
  const vertical: Facing = dy < 0 ? "up" : "down";

  const order: Facing[] = preferHorizontal
    ? [horizontal, vertical]
    : [vertical, horizontal];

  // Ensure all four directions are considered as a fallback so the enemy
  // doesn't get permanently stuck against a wall.
  const all: Facing[] = ["up", "down", "left", "right"];
  const seen = new Set(order);
  const candidates = [...order, ...all.filter((f) => !seen.has(f))];

  for (const dir of candidates) {
    const delta = DELTAS[dir];
    const nx = enemy.x + delta.dx;
    const ny = enemy.y + delta.dy;
    if (isPassable(state.grid, nx, ny, state.playerX, state.playerY)) {
      return dir;
    }
  }
  // Nowhere to go; keep current facing.
  return enemy.facing;
}

export function step(state: TankState, dtSeconds: number): TankState {
  if (state.status !== "playing") {
    return state;
  }

  let grid = state.grid;
  let bullets = state.bullets;
  let enemy = state.enemy;
  let score = state.score;
  let enemiesDefeated = state.enemiesDefeated;
  let status: Status = state.status;

  const playerCooldown = Math.max(0, state.playerCooldown - dtSeconds);

  if (enemy) {
    enemy = { ...enemy, cooldown: Math.max(0, enemy.cooldown - dtSeconds) };
  }

  // --- Advance bullets ---
  const survivingBullets: Bullet[] = [];
  let gridCopied = false;
  function ensureGridCopy() {
    if (!gridCopied) {
      grid = grid.map((row) => row.slice());
      gridCopied = true;
    }
  }

  for (const bullet of bullets) {
    const delta = DELTAS[bullet.facing];
    const nx = bullet.x + delta.dx * BULLET_SPEED * dtSeconds;
    const ny = bullet.y + delta.dy * BULLET_SPEED * dtSeconds;

    const cellX = Math.round(nx);
    const cellY = Math.round(ny);

    if (!inBounds(cellX, cellY) || nx < 0 || ny < 0 || nx > GRID_SIZE - 1 || ny > GRID_SIZE - 1) {
      // Left the grid: bullet is destroyed.
      continue;
    }

    const tile = grid[cellY]?.[cellX];
    if (tile === "steel") {
      continue;
    }
    if (tile === "brick") {
      ensureGridCopy();
      grid[cellY]![cellX] = "empty";
      continue;
    }

    if (bullet.owner === "enemy" && cellX === state.playerX && cellY === state.playerY) {
      status = "over";
      continue;
    }

    if (bullet.owner === "player" && enemy && cellX === enemy.x && cellY === enemy.y) {
      enemiesDefeated += 1;
      score += POINTS_PER_ENEMY;
      enemy = enemiesDefeated >= state.enemiesTotal ? null : createEnemy();
      if (enemiesDefeated >= state.enemiesTotal) {
        status = "won";
      }
      continue;
    }

    survivingBullets.push({ ...bullet, x: nx, y: ny });
  }
  bullets = survivingBullets;

  // --- Enemy AI ---
  if (enemy && status === "playing") {
    let moveTimer = enemy.moveTimer - dtSeconds;
    let ex = enemy.x;
    let ey = enemy.y;
    let facing = enemy.facing;

    if (moveTimer <= 0) {
      moveTimer = ENEMY_MOVE_INTERVAL;
      const dir = pickEnemyDirection(state, enemy);
      facing = dir;
      const delta = DELTAS[dir];
      const nx = ex + delta.dx;
      const ny = ey + delta.dy;
      if (isPassable(grid, nx, ny, state.playerX, state.playerY)) {
        ex = nx;
        ey = ny;
      }
    }

    let cooldown = enemy.cooldown;
    const alignedWithPlayer = ex === state.playerX || ey === state.playerY;
    if (alignedWithPlayer && cooldown <= 0) {
      // Face toward the player's row/column before firing.
      if (ex === state.playerX) {
        facing = ey < state.playerY ? "down" : "up";
      } else {
        facing = ex < state.playerX ? "right" : "left";
      }
      bullets = [...bullets, fireFrom(ex, ey, facing, "enemy")];
      cooldown = ENEMY_FIRE_COOLDOWN;
    }

    enemy = { x: ex, y: ey, facing, cooldown, moveTimer };
  }

  return {
    ...state,
    grid,
    bullets,
    enemy,
    score,
    enemiesDefeated,
    playerCooldown,
    status,
  };
}
