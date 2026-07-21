export const FIELD_WIDTH = 500;
export const FIELD_HEIGHT = 260;
export const PLAYER_X = 16;
export const PLAYER_SIZE = 20;
export const PLAYER_SPEED = 220;

export const BULLET_WIDTH = 10;
export const BULLET_HEIGHT = 3;
export const BULLET_SPEED = 380;
export const FIRE_COOLDOWN_MS = 260;

export const ENEMY_SIZE = 20;
export const ENEMY_SPEED_MIN = 80;
export const ENEMY_SPEED_MAX = 170;
export const ENEMY_SPAWN_INTERVAL_MS = 850;

export const STARTING_LIVES = 3;
export const POINTS_PER_ENEMY = 15;

export type Status = "playing" | "over";

export interface Bullet {
  x: number;
  y: number;
}

export interface Enemy {
  x: number;
  y: number;
  vx: number;
}

export interface SpaceImpactState {
  playerY: number;
  fireCooldown: number;
  bullets: Bullet[];
  enemies: Enemy[];
  spawnAccumulatorMs: number;
  score: number;
  lives: number;
  status: Status;
}

export function createInitialState(): SpaceImpactState {
  return {
    playerY: FIELD_HEIGHT / 2 - PLAYER_SIZE / 2,
    fireCooldown: 0,
    bullets: [],
    enemies: [],
    spawnAccumulatorMs: 0,
    score: 0,
    lives: STARTING_LIVES,
    status: "playing",
  };
}

export function setPlayerY(
  state: SpaceImpactState,
  y: number
): SpaceImpactState {
  const clamped = Math.max(0, Math.min(FIELD_HEIGHT - PLAYER_SIZE, y));
  if (clamped === state.playerY) {
    return state;
  }
  return { ...state, playerY: clamped };
}

export function firePlayerBullet(
  state: SpaceImpactState
): SpaceImpactState {
  if (state.status !== "playing" || state.fireCooldown > 0) {
    return state;
  }
  const bullet: Bullet = {
    x: PLAYER_X + PLAYER_SIZE,
    y: state.playerY + PLAYER_SIZE / 2,
  };
  return {
    ...state,
    bullets: [...state.bullets, bullet],
    fireCooldown: FIRE_COOLDOWN_MS,
  };
}

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

export function step(
  state: SpaceImpactState,
  dtSeconds: number
): SpaceImpactState {
  if (state.status !== "playing") {
    return state;
  }

  const dtMs = dtSeconds * 1000;
  const fireCooldown = Math.max(0, state.fireCooldown - dtMs);

  let spawnAccumulatorMs = state.spawnAccumulatorMs + dtMs;
  const spawned: Enemy[] = [];
  while (spawnAccumulatorMs >= ENEMY_SPAWN_INTERVAL_MS) {
    spawnAccumulatorMs -= ENEMY_SPAWN_INTERVAL_MS;
    const y = Math.random() * (FIELD_HEIGHT - ENEMY_SIZE);
    const vx = -(
      ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN)
    );
    spawned.push({ x: FIELD_WIDTH, y, vx });
  }

  const bullets = state.bullets
    .map((bullet) => ({ x: bullet.x + BULLET_SPEED * dtSeconds, y: bullet.y }))
    .filter((bullet) => bullet.x < FIELD_WIDTH);

  const movedEnemies = [...state.enemies, ...spawned]
    .map((enemy) => ({ ...enemy, x: enemy.x + enemy.vx * dtSeconds }))
    .filter((enemy) => enemy.x + ENEMY_SIZE > 0);

  let score = state.score;
  const hitBulletIndices = new Set<number>();
  const survivingEnemies: Enemy[] = [];

  for (const enemy of movedEnemies) {
    let hit = false;
    for (let i = 0; i < bullets.length; i++) {
      if (hitBulletIndices.has(i)) {
        continue;
      }
      const bullet = bullets[i]!;
      if (
        overlaps(
          bullet.x,
          bullet.y - BULLET_HEIGHT / 2,
          BULLET_WIDTH,
          BULLET_HEIGHT,
          enemy.x,
          enemy.y,
          ENEMY_SIZE,
          ENEMY_SIZE
        )
      ) {
        hitBulletIndices.add(i);
        score += POINTS_PER_ENEMY;
        hit = true;
        break;
      }
    }
    if (!hit) {
      survivingEnemies.push(enemy);
    }
  }

  const survivingBullets = bullets.filter(
    (_, index) => !hitBulletIndices.has(index)
  );

  let lives = state.lives;
  let status: Status = state.status;
  const remainingEnemies: Enemy[] = [];
  for (const enemy of survivingEnemies) {
    if (
      overlaps(
        enemy.x,
        enemy.y,
        ENEMY_SIZE,
        ENEMY_SIZE,
        PLAYER_X,
        state.playerY,
        PLAYER_SIZE,
        PLAYER_SIZE
      )
    ) {
      lives -= 1;
      if (lives <= 0) {
        status = "over";
      }
      continue;
    }
    remainingEnemies.push(enemy);
  }

  return {
    ...state,
    fireCooldown,
    bullets: survivingBullets,
    enemies: remainingEnemies,
    spawnAccumulatorMs,
    score,
    lives,
    status,
  };
}
