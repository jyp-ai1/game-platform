// Galaxy Defender engine — pure, DOM-free simulation.
//
// Design intent: unlike a Space-Invaders-style descending grid, the enemy
// formation here holds a gentle sway near the top of the field and
// periodically peels a single enemy off into a swooping bezier dive-attack
// toward the player before it returns to formation. Only diving enemies can
// fire — formation enemies never do. This is the core mechanical
// differentiator from a sibling "Space Defender" game.
//
// Design choice (endless vs capped waves): this implementation is an
// ENDLESS wave shooter — clearing a formation simply spawns a denser/faster
// wave and `status` stays "playing". The "won" status is kept in the type
// for API completeness but is never produced by this engine.

export interface Vec2 {
  x: number;
  y: number;
}

export type EnemyFlightState = "forming" | "in-formation" | "diving" | "returning";

export const FIELD_WIDTH = 400;
export const FIELD_HEIGHT = 500;
export const PLAYER_Y = FIELD_HEIGHT - 30;
export const PLAYER_WIDTH = 30;
export const PLAYER_HEIGHT = 18;

export const ENEMY_WIDTH = 24;
export const ENEMY_HEIGHT = 18;

export const FORMATION_ROWS = 4;
export const FORMATION_COLS = 6;
export const FORMATION_H_GAP = 48;
export const FORMATION_V_GAP = 36;
export const FORMATION_TOP_OFFSET = 50;

export const PLAYER_BULLET_SPEED = 320;
export const ENEMY_BULLET_SPEED = 200;
export const PLAYER_FIRE_COOLDOWN = 0.35;

export const SWAY_AMPLITUDE = 18;
export const SWAY_SPEED = 1.2; // radians/sec-ish phase multiplier

export const BASE_DIVE_INTERVAL_MIN = 2;
export const BASE_DIVE_INTERVAL_MAX = 4;
export const DIVE_DURATION_SECONDS = 1.5;
export const DIVE_TARGET_Y = FIELD_HEIGHT - 80;
export const DIVE_FIRE_CHANCE_PER_SECOND = 0.6;

export const RETURN_SPEED = 260; // px/sec while returning to formation
export const RETURN_EPSILON = 4;

export const POINTS_PER_FORMATION_KILL = 50;
export const POINTS_PER_DIVE_KILL = 100;

export const STARTING_LIVES = 3;
export const INITIAL_DIVE_TIMER = 3;

let nextEnemyId = 1;

export interface Enemy {
  id: number;
  formationSlot: Vec2;
  pos: Vec2;
  state: EnemyFlightState;
  diveProgress: number;
  diveControl?: Vec2;
  diveTarget?: Vec2;
}

export interface Bullet {
  x: number;
  y: number;
  vy: number;
  owner: "player" | "enemy";
}

export type Status = "playing" | "over" | "won";

export interface GalaxyState {
  playerX: number;
  playerCooldown: number;
  enemies: Enemy[];
  bullets: Bullet[];
  wave: number;
  score: number;
  lives: number;
  diveTimer: number;
  time: number;
  status: Status;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formationCenterX(): number {
  const totalWidth = (FORMATION_COLS - 1) * FORMATION_H_GAP;
  return FIELD_WIDTH / 2 - totalWidth / 2;
}

function diveIntervalForWave(wave: number): { min: number; max: number } {
  // Slightly faster (denser) pacing each wave, floored so it never becomes
  // instant/unfair.
  const shrink = Math.min(1.2, (wave - 1) * 0.15);
  return {
    min: Math.max(0.8, BASE_DIVE_INTERVAL_MIN - shrink),
    max: Math.max(1.4, BASE_DIVE_INTERVAL_MAX - shrink),
  };
}

function randomDiveInterval(wave: number): number {
  const { min, max } = diveIntervalForWave(wave);
  return min + Math.random() * (max - min);
}

export function createFormation(wave: number): Enemy[] {
  const enemies: Enemy[] = [];
  const startX = formationCenterX();
  for (let row = 0; row < FORMATION_ROWS; row++) {
    for (let col = 0; col < FORMATION_COLS; col++) {
      const slot: Vec2 = {
        x: startX + col * FORMATION_H_GAP,
        y: FORMATION_TOP_OFFSET + row * FORMATION_V_GAP,
      };
      enemies.push({
        id: nextEnemyId++,
        formationSlot: slot,
        pos: { x: slot.x, y: slot.y },
        state: "in-formation",
        diveProgress: 0,
      });
    }
  }
  // wave is currently unused for formation shape beyond dive pacing, but is
  // accepted so callers can grow density in the future without an API
  // change.
  void wave;
  return enemies;
}

export function createInitialState(wave?: number): GalaxyState {
  const startingWave = wave ?? 1;
  return {
    playerX: FIELD_WIDTH / 2,
    playerCooldown: 0,
    enemies: createFormation(startingWave),
    bullets: [],
    wave: startingWave,
    score: 0,
    lives: STARTING_LIVES,
    diveTimer: INITIAL_DIVE_TIMER,
    time: 0,
    status: "playing",
  };
}

export function setPlayerX(state: GalaxyState, x: number): GalaxyState {
  const clamped = clamp(x, PLAYER_WIDTH / 2, FIELD_WIDTH - PLAYER_WIDTH / 2);
  if (clamped === state.playerX) {
    return state;
  }
  return { ...state, playerX: clamped };
}

export function firePlayerBullet(state: GalaxyState): GalaxyState {
  if (state.status !== "playing" || state.playerCooldown > 0) {
    return state;
  }
  const bullet: Bullet = {
    x: state.playerX,
    y: PLAYER_Y,
    vy: -PLAYER_BULLET_SPEED,
    owner: "player",
  };
  return {
    ...state,
    bullets: [...state.bullets, bullet],
    playerCooldown: PLAYER_FIRE_COOLDOWN,
  };
}

function quadraticBezier(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return (
    ax - aw / 2 < bx + bw / 2 &&
    ax + aw / 2 > bx - bw / 2 &&
    ay - ah / 2 < by + bh / 2 &&
    ay + ah / 2 > by - bh / 2
  );
}

export function step(state: GalaxyState, dtSeconds: number): GalaxyState {
  if (state.status !== "playing") {
    return state;
  }

  const time = state.time + dtSeconds;
  const playerCooldown = Math.max(0, state.playerCooldown - dtSeconds);

  // 1) Sway in-formation enemies, advance diving/returning enemies.
  let enemies = state.enemies.map((enemy) => {
    if (enemy.state === "in-formation" || enemy.state === "forming") {
      const phase = time * SWAY_SPEED + enemy.formationSlot.x * 0.05;
      const swayX = enemy.formationSlot.x + Math.sin(phase) * SWAY_AMPLITUDE;
      return {
        ...enemy,
        state: "in-formation" as EnemyFlightState,
        pos: { x: swayX, y: enemy.formationSlot.y },
      };
    }
    if (enemy.state === "diving" && enemy.diveControl && enemy.diveTarget) {
      const diveProgress = Math.min(1, enemy.diveProgress + dtSeconds / DIVE_DURATION_SECONDS);
      const pos = quadraticBezier(enemy.formationSlot, enemy.diveControl, enemy.diveTarget, diveProgress);
      if (diveProgress >= 1) {
        return { ...enemy, pos, diveProgress, state: "returning" as EnemyFlightState };
      }
      return { ...enemy, pos, diveProgress };
    }
    if (enemy.state === "returning") {
      const dx = enemy.formationSlot.x - enemy.pos.x;
      const dy = enemy.formationSlot.y - enemy.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= RETURN_EPSILON) {
        return {
          ...enemy,
          pos: { x: enemy.formationSlot.x, y: enemy.formationSlot.y },
          state: "in-formation" as EnemyFlightState,
          diveProgress: 0,
          diveControl: undefined,
          diveTarget: undefined,
        };
      }
      const step = RETURN_SPEED * dtSeconds;
      const travel = Math.min(step, dist);
      const ux = dx / dist;
      const uy = dy / dist;
      return {
        ...enemy,
        pos: { x: enemy.pos.x + ux * travel, y: enemy.pos.y + uy * travel },
      };
    }
    return enemy;
  });

  // 2) Dive timer: peel off a random in-formation enemy.
  let diveTimer = state.diveTimer - dtSeconds;
  const newBullets: Bullet[] = [];

  if (diveTimer <= 0) {
    const candidates = enemies.filter((e) => e.state === "in-formation");
    if (candidates.length > 0) {
      const chosen = candidates[Math.floor(Math.random() * candidates.length)]!;
      const diveControl: Vec2 = {
        x: clamp(chosen.pos.x + (Math.random() - 0.5) * 160, 20, FIELD_WIDTH - 20),
        y: (chosen.pos.y + DIVE_TARGET_Y) / 2 + (Math.random() - 0.5) * 60,
      };
      const diveTarget: Vec2 = {
        x: clamp(state.playerX + (Math.random() - 0.5) * 40, 20, FIELD_WIDTH - 20),
        y: DIVE_TARGET_Y,
      };
      enemies = enemies.map((e) =>
        e.id === chosen.id
          ? { ...e, state: "diving" as EnemyFlightState, diveProgress: 0, diveControl, diveTarget }
          : e
      );
    }
    diveTimer = randomDiveInterval(state.wave);
  }

  // 3) Diving enemies probabilistically fire.
  for (const enemy of enemies) {
    if (enemy.state === "diving") {
      const fireChance = DIVE_FIRE_CHANCE_PER_SECOND * dtSeconds;
      if (Math.random() < fireChance) {
        newBullets.push({ x: enemy.pos.x, y: enemy.pos.y, vy: ENEMY_BULLET_SPEED, owner: "enemy" });
      }
    }
  }

  // 4) Advance bullets, cull off-field.
  let bullets = [...state.bullets, ...newBullets]
    .map((b) => ({ ...b, y: b.y + b.vy * dtSeconds }))
    .filter((b) => b.y >= -20 && b.y <= FIELD_HEIGHT + 20);

  // 5) Collisions: player bullets vs enemies.
  let score = state.score;
  const deadEnemyIds = new Set<number>();
  const consumedBulletIndices = new Set<number>();

  bullets.forEach((bullet, index) => {
    if (bullet.owner !== "player" || consumedBulletIndices.has(index)) {
      return;
    }
    for (const enemy of enemies) {
      if (deadEnemyIds.has(enemy.id)) {
        continue;
      }
      if (
        rectsOverlap(
          bullet.x,
          bullet.y,
          4,
          8,
          enemy.pos.x,
          enemy.pos.y,
          ENEMY_WIDTH,
          ENEMY_HEIGHT
        )
      ) {
        deadEnemyIds.add(enemy.id);
        consumedBulletIndices.add(index);
        score += enemy.state === "diving" ? POINTS_PER_DIVE_KILL : POINTS_PER_FORMATION_KILL;
        break;
      }
    }
  });

  enemies = enemies.filter((e) => !deadEnemyIds.has(e.id));
  bullets = bullets.filter((_, index) => !consumedBulletIndices.has(index));

  // 6) Collisions: enemy bullets vs player.
  let lives = state.lives;
  const survivingBullets: Bullet[] = [];
  for (const bullet of bullets) {
    if (
      bullet.owner === "enemy" &&
      rectsOverlap(bullet.x, bullet.y, 4, 8, state.playerX, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT)
    ) {
      lives -= 1;
      continue;
    }
    survivingBullets.push(bullet);
  }
  bullets = survivingBullets;

  let status: Status = state.status;
  if (lives <= 0) {
    status = "over";
  }

  let wave = state.wave;
  if (status === "playing" && enemies.length === 0) {
    wave += 1;
    enemies = createFormation(wave);
    diveTimer = randomDiveInterval(wave);
  }

  return {
    ...state,
    playerCooldown,
    enemies,
    bullets,
    wave,
    score,
    lives,
    diveTimer,
    time,
    status,
  };
}
