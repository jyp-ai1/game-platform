/** Snake.io world engine — multi-snake realtime state. */

export const WORLD_SIZE = 80;
export const TICK_MS = 120;
export const FOOD_COUNT = 40;
export const RESPAWN_MS = 2000;

export type Direction = "up" | "down" | "left" | "right";

export interface Vec {
  x: number;
  y: number;
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
}

export interface SnakeIoWorld {
  tick: number;
  snakes: Record<string, SnakeEntity>;
  food: Vec[];
  rankings: { deviceId: string; nickname: string; score: number }[];
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

function randPos(): Vec {
  return {
    x: Math.floor(Math.random() * WORLD_SIZE),
    y: Math.floor(Math.random() * WORLD_SIZE),
  };
}

function occupied(world: SnakeIoWorld, pos: Vec): boolean {
  for (const snake of Object.values(world.snakes)) {
    if (!snake.alive) continue;
    if (snake.segments.some((s) => s.x === pos.x && s.y === pos.y)) return true;
  }
  return world.food.some((f) => f.x === pos.x && f.y === pos.y);
}

export function spawnFood(world: SnakeIoWorld, count = 1): void {
  for (let i = 0; i < count; i++) {
    let pos = randPos();
    let tries = 0;
    while (occupied(world, pos) && tries < 100) {
      pos = randPos();
      tries++;
    }
    world.food.push(pos);
  }
}

export function createSnake(deviceId: string, nickname: string, index: number): SnakeEntity {
  const mid = Math.floor(WORLD_SIZE / 2) + (index % 5) * 3;
  return {
    deviceId,
    nickname,
    segments: [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }],
    direction: "right",
    pendingDirection: "right",
    score: 0,
    alive: true,
    color: COLORS[index % COLORS.length]!,
  };
}

export function createInitialWorld(
  players: { deviceId: string; nickname: string }[]
): SnakeIoWorld {
  const world: SnakeIoWorld = { tick: 0, snakes: {}, food: [], rankings: [] };
  players.forEach((p, i) => {
    world.snakes[p.deviceId] = createSnake(p.deviceId, p.nickname, i);
  });
  spawnFood(world, FOOD_COUNT);
  updateRankings(world);
  return world;
}

export function setInput(world: SnakeIoWorld, deviceId: string, direction: Direction): void {
  const snake = world.snakes[deviceId];
  if (!snake || !snake.alive || isOpposite(direction, snake.direction)) return;
  snake.pendingDirection = direction;
}

function killSnake(snake: SnakeEntity): void {
  snake.alive = false;
  snake.respawnAt = Date.now() + RESPAWN_MS;
}

function respawnSnake(world: SnakeIoWorld, snake: SnakeEntity, index: number): void {
  const mid = Math.floor(Math.random() * (WORLD_SIZE - 10)) + 5;
  snake.segments = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
  snake.direction = "right";
  snake.pendingDirection = "right";
  snake.alive = true;
  snake.score = Math.max(0, snake.score - 20);
  snake.color = COLORS[index % COLORS.length]!;
  snake.respawnAt = undefined;
}

export function tickWorld(world: SnakeIoWorld, now = Date.now()): SnakeIoWorld {
  world.tick += 1;

  for (const [i, snake] of Object.entries(world.snakes)) {
    const idx = Object.keys(world.snakes).indexOf(i);
    if (!snake.alive) {
      if (snake.respawnAt && now >= snake.respawnAt) respawnSnake(world, snake, idx);
      continue;
    }

    snake.direction = snake.pendingDirection;
    const head = snake.segments[0]!;
    const delta = DELTAS[snake.direction];
    const next: Vec = { x: head.x + delta.x, y: head.y + delta.y };

    if (next.x < 0 || next.x >= WORLD_SIZE || next.y < 0 || next.y >= WORLD_SIZE) {
      killSnake(snake);
      continue;
    }

    const ate = world.food.findIndex((f) => f.x === next.x && f.y === next.y);
    const bodyCheck = ate >= 0 ? snake.segments : snake.segments.slice(0, -1);
    const hitSelf = bodyCheck.some((s) => s.x === next.x && s.y === next.y);
    const hitOther = Object.values(world.snakes).some(
      (other) =>
        other.alive &&
        other.deviceId !== snake.deviceId &&
        other.segments.some((s) => s.x === next.x && s.y === next.y)
    );

    if (hitSelf || hitOther) {
      killSnake(snake);
      continue;
    }

    snake.segments = ate >= 0 ? [next, ...snake.segments] : [next, ...snake.segments.slice(0, -1)];
    if (ate >= 0) {
      world.food.splice(ate, 1);
      snake.score += 10;
      spawnFood(world, 1);
    }
  }

  updateRankings(world);
  return world;
}

export function updateRankings(world: SnakeIoWorld): void {
  world.rankings = Object.values(world.snakes)
    .map((s) => ({ deviceId: s.deviceId, nickname: s.nickname, score: s.score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
