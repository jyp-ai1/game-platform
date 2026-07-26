/** Snake.io world engine — balance-aware multi-snake realtime. */
import type { ComputedBalance, FoodKind, WorldFeature } from "@game-platform/shared";

export type Direction = "up" | "down" | "left" | "right";

export interface Vec {
  x: number;
  y: number;
}

export interface FoodItem {
  x: number;
  y: number;
  kind: FoodKind;
  value: number;
}

export interface SnakeEntity {
  deviceId: string;
  nickname: string;
  segments: Vec[];
  direction: Direction;
  pendingDirection: Direction;
  score: number;
  alive: boolean;
  color: string;
  respawnAt?: number;
  invincibleUntil?: number;
  spectating?: boolean;
}

export interface SnakeIoWorld {
  tick: number;
  config: ComputedBalance;
  snakes: Record<string, SnakeEntity>;
  food: FoodItem[];
  features: WorldFeature[];
  rankings: { deviceId: string; nickname: string; score: number }[];
  bossSpawned?: boolean;
}

const DELTAS: Record<Direction, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];

export function isOpposite(a: Direction, b: Direction): boolean {
  const da = DELTAS[a];
  const db = DELTAS[b];
  return da.x === -db.x && da.y === -db.y;
}

function randPos(worldSize: number): Vec {
  return { x: Math.floor(Math.random() * worldSize), y: Math.floor(Math.random() * worldSize) };
}

function isBlocked(world: SnakeIoWorld, pos: Vec): boolean {
  if (pos.x < 0 || pos.x >= world.config.worldSize || pos.y < 0 || pos.y >= world.config.worldSize) {
    return true;
  }
  for (const f of world.features) {
    if (f.type === "wall" || f.type === "river") {
      const fw = f.w ?? 1;
      const fh = f.h ?? 1;
      if (pos.x >= f.x && pos.x < f.x + fw && pos.y >= f.y && pos.y < f.y + fh) return true;
    }
  }
  return false;
}

function occupied(world: SnakeIoWorld, pos: Vec): boolean {
  for (const snake of Object.values(world.snakes)) {
    if (!snake.alive || snake.spectating) continue;
    if (snake.segments.some((s) => s.x === pos.x && s.y === pos.y)) return true;
  }
  return world.food.some((f) => f.x === pos.x && f.y === pos.y);
}

export function spawnFoodItems(world: SnakeIoWorld, count = 1): void {
  const w = world.config.worldSize;
  for (let i = 0; i < count; i++) {
    let pos = randPos(w);
    let tries = 0;
    while ((occupied(world, pos) || isBlocked(world, pos)) && tries < 100) {
      pos = randPos(w);
      tries++;
    }
    world.food.push({ x: pos.x, y: pos.y, kind: "normal", value: 10 });
  }
}

function spawnBossFood(world: SnakeIoWorld): void {
  if (world.bossSpawned || !world.config.bossEventsEnabled) return;
  const mid = Math.floor(world.config.worldSize / 2);
  const bosses: FoodItem[] = [
    { x: mid, y: mid, kind: "golden_apple", value: 50 },
    { x: mid + 2, y: mid, kind: "meteor", value: 30 },
    { x: mid - 2, y: mid, kind: "black_hole", value: 40 },
  ];
  for (const b of bosses) {
    if (!occupied(world, b)) world.food.push(b);
  }
  world.bossSpawned = true;
}

function enemyPositions(world: SnakeIoWorld, excludeId: string): Vec[] {
  const out: Vec[] = [];
  for (const snake of Object.values(world.snakes)) {
    if (!snake.alive || snake.deviceId === excludeId) continue;
    if (snake.segments[0]) out.push(snake.segments[0]);
  }
  return out;
}

function findSafePosition(world: SnakeIoWorld, excludeId: string): Vec {
  const minDist = world.config.safeSpawnMinDistance;
  const w = world.config.worldSize;
  const enemies = enemyPositions(world, excludeId);
  for (let t = 0; t < 120; t++) {
    const pos = { x: Math.floor(Math.random() * (w - 10)) + 5, y: Math.floor(Math.random() * (w - 10)) + 5 };
    if (occupied(world, pos) || isBlocked(world, pos)) continue;
    const tooClose = enemies.some((e) => Math.hypot(e.x - pos.x, e.y - pos.y) < minDist);
    if (!tooClose) return pos;
  }
  return { x: Math.floor(w / 2), y: Math.floor(w / 2) };
}

export function createSnake(
  deviceId: string,
  nickname: string,
  index: number,
  world: SnakeIoWorld
): SnakeEntity {
  const pos = findSafePosition(world, deviceId);
  return {
    deviceId,
    nickname,
    segments: [pos, { x: pos.x - 1, y: pos.y }, { x: pos.x - 2, y: pos.y }],
    direction: "right",
    pendingDirection: "right",
    score: 0,
    alive: true,
    color: COLORS[index % COLORS.length]!,
    invincibleUntil: Date.now() + world.config.invincibilityMs,
  };
}

export function createInitialWorld(
  players: { deviceId: string; nickname: string }[],
  config: ComputedBalance
): SnakeIoWorld {
  const world: SnakeIoWorld = {
    tick: 0,
    config,
    snakes: {},
    food: [],
    features: config.features,
    rankings: [],
  };
  players.forEach((p, i) => {
    world.snakes[p.deviceId] = createSnake(p.deviceId, p.nickname, i, world);
  });
  spawnFoodItems(world, config.foodCount);
  spawnBossFood(world);
  updateRankings(world);
  return world;
}

export function setInput(world: SnakeIoWorld, deviceId: string, direction: Direction): void {
  const snake = world.snakes[deviceId];
  if (!snake || !snake.alive || snake.spectating || isOpposite(direction, snake.direction)) return;
  snake.pendingDirection = direction;
}

function killSnake(snake: SnakeEntity, config: ComputedBalance): void {
  snake.alive = false;
  snake.spectating = true;
  snake.respawnAt = Date.now() + config.respawnMs;
}

function respawnSnake(world: SnakeIoWorld, snake: SnakeEntity, index: number, now: number): void {
  const pos = findSafePosition(world, snake.deviceId);
  snake.segments = [pos, { x: pos.x - 1, y: pos.y }, { x: pos.x - 2, y: pos.y }];
  snake.direction = "right";
  snake.pendingDirection = "right";
  snake.alive = true;
  snake.spectating = false;
  snake.score = Math.max(0, snake.score - Math.round(20 * world.config.rewardRate));
  snake.color = COLORS[index % COLORS.length]!;
  snake.respawnAt = undefined;
  snake.invincibleUntil = now + world.config.invincibilityMs;
}

export function tickWorld(world: SnakeIoWorld, now = Date.now()): SnakeIoWorld {
  world.tick += 1;

  if (world.food.length < world.config.foodCount * 0.6) {
    spawnFoodItems(world, Math.min(15, Math.ceil((world.config.foodCount - world.food.length) * 0.2)));
  }

  for (const [i, snake] of Object.entries(world.snakes)) {
    const idx = Object.keys(world.snakes).indexOf(i);
    if (!snake.alive) {
      if (snake.respawnAt && now >= snake.respawnAt) respawnSnake(world, snake, idx, now);
      continue;
    }
    if (snake.invincibleUntil && now < snake.invincibleUntil) continue;

    snake.direction = snake.pendingDirection;
    const head = snake.segments[0]!;
    const delta = DELTAS[snake.direction];
    const next: Vec = { x: head.x + delta.x, y: head.y + delta.y };

    if (isBlocked(world, next)) {
      killSnake(snake, world.config);
      continue;
    }

    const foodIdx = world.food.findIndex((f) => f.x === next.x && f.y === next.y);
    const bodyCheck = foodIdx >= 0 ? snake.segments : snake.segments.slice(0, -1);
    const hitSelf = bodyCheck.some((s) => s.x === next.x && s.y === next.y);
    const hitOther = Object.values(world.snakes).some(
      (other) =>
        other.alive &&
        !other.spectating &&
        other.deviceId !== snake.deviceId &&
        !(other.invincibleUntil && now < other.invincibleUntil) &&
        other.segments.some((s) => s.x === next.x && s.y === next.y)
    );

    if (hitSelf || hitOther) {
      killSnake(snake, world.config);
      continue;
    }

    snake.segments = foodIdx >= 0 ? [next, ...snake.segments] : [next, ...snake.segments.slice(0, -1)];
    if (foodIdx >= 0) {
      const food = world.food[foodIdx]!;
      world.food.splice(foodIdx, 1);
      snake.score += Math.round(food.value * world.config.rewardRate);
      spawnFoodItems(world, 1);
    }
  }

  updateRankings(world);
  return world;
}

export function updateRankings(world: SnakeIoWorld): void {
  world.rankings = Object.values(world.snakes)
    .map((s) => ({ deviceId: s.deviceId, nickname: s.nickname, score: s.score }))
    .sort((a, b) => b.score - a.score);
}

export function getMyRank(world: SnakeIoWorld, deviceId: string): number {
  const idx = world.rankings.findIndex((r) => r.deviceId === deviceId);
  return idx >= 0 ? idx + 1 : world.rankings.length + 1;
}

export function getSpectatorTarget(world: SnakeIoWorld | null | undefined, preferDeviceId?: string): string | null {
  if (!world) return null;
  if (preferDeviceId && world.snakes[preferDeviceId]?.alive) return preferDeviceId;
  const top = world.rankings[0];
  if (top && world.snakes[top.deviceId]?.alive) return top.deviceId;
  const alive = Object.values(world.snakes).find((s) => s.alive);
  return alive?.deviceId ?? null;
}

export function getDeathPosition(snake: SnakeEntity): Vec | null {
  return snake.segments[0] ?? null;
}
