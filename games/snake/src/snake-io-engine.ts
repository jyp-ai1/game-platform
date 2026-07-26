/** Snake.io world engine — balance-aware multi-snake realtime. */
import { BossEngine, type BossEncounter } from "@game-platform/replay-engine/balance";
import type { ActivePowerUp, ComputedBalance, FoodKind, MatchObjective, ReplayMoment, WorldEvent, WorldFeature } from "@game-platform/shared";

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
  powerUp?: ActivePowerUp;
  killStreak?: number;
  foodEaten?: number;
}

export interface SnakeIoWorld {
  tick: number;
  config: ComputedBalance;
  snakes: Record<string, SnakeEntity>;
  food: FoodItem[];
  features: WorldFeature[];
  rankings: { deviceId: string; nickname: string; score: number }[];
  bossSpawned?: boolean;
  boss?: BossEncounter;
  expMultiplier?: number;
  events: WorldEvent[];
  objective: MatchObjective;
  moments: ReplayMoment[];
  deathZones: { x: number; y: number; at: number }[];
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

function spawnWorldBoss(world: SnakeIoWorld): void {
  if (world.boss || world.bossSpawned || !world.config.bossEventsEnabled) return;
  const kind = world.config.environment.activeBoss;
  if (!kind) return;
  world.boss = BossEngine.spawn(kind, world.config.worldSize);
  world.bossSpawned = true;
}

function tickBoss(world: SnakeIoWorld): void {
  if (!world.boss || world.boss.defeated) return;
  for (const snake of Object.values(world.snakes)) {
    if (!snake.alive || !snake.segments[0]) continue;
    const head = snake.segments[0];
    const dist = Math.hypot(head.x - world.boss!.x, head.y - world.boss!.y);
    if (dist <= 10 && world.tick % 20 === 0) {
      const boss = world.boss;
      world.boss = BossEngine.damage(boss, 8);
      if (world.boss.defeated) {
        const playerCount = Object.keys(world.snakes).length;
        const reward = BossEngine.reward(world.boss, playerCount);
        for (const s of Object.values(world.snakes)) {
          if (s.alive) s.score += reward.xp;
        }
      }
      break;
    }
  }
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
  const campRadius = world.config.antiCampEnabled ? world.config.safeZoneRadius : 0;
  const now = Date.now();
  const recentDeaths = world.deathZones.filter((d) => now - d.at < 30_000);

  for (let t = 0; t < 150; t++) {
    const margin = world.config.safeZoneRadius;
    const pos = {
      x: Math.floor(Math.random() * (w - margin * 2)) + margin,
      y: Math.floor(Math.random() * (w - margin * 2)) + margin,
    };
    if (occupied(world, pos) || isBlocked(world, pos)) continue;
    const tooClose = enemies.some((e) => Math.hypot(e.x - pos.x, e.y - pos.y) < minDist);
    if (tooClose) continue;
    const inCamp = recentDeaths.some((d) => Math.hypot(d.x - pos.x, d.y - pos.y) < campRadius);
    if (inCamp) continue;
    return pos;
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
    invincibleUntil: Date.now() + world.config.spawnShieldMs,
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
    events: [],
    objective: { kind: "score_race", target: 500, progress: {}, label: "최고 점수" },
    moments: [],
    deathZones: [],
  };
  players.forEach((p, i) => {
    world.snakes[p.deviceId] = createSnake(p.deviceId, p.nickname, i, world);
  });
  spawnFoodItems(world, config.foodCount);
  spawnWorldBoss(world);
  updateRankings(world);
  return world;
}

export function setInput(world: SnakeIoWorld, deviceId: string, direction: Direction): void {
  const snake = world.snakes[deviceId];
  if (!snake || !snake.alive || snake.spectating || isOpposite(direction, snake.direction)) return;
  snake.pendingDirection = direction;
}

function killSnake(snake: SnakeEntity, config: ComputedBalance, world: SnakeIoWorld): void {
  const head = snake.segments[0];
  if (head && config.antiCampEnabled) {
    world.deathZones = [...world.deathZones.filter((d) => Date.now() - d.at < 30_000), { x: head.x, y: head.y, at: Date.now() }].slice(-40);
  }
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
  snake.invincibleUntil = now + world.config.spawnShieldMs;
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
      killSnake(snake, world.config, world);
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
      if (hitOther) {
        const killer = Object.values(world.snakes).find(
          (o) => o.alive && o.deviceId !== snake.deviceId &&
            o.segments.some((s) => s.x === next.x && s.y === next.y)
        );
        if (killer) {
          killer.killStreak = (killer.killStreak ?? 0) + 1;
          snake.killStreak = 0;
        }
      }
      killSnake(snake, world.config, world);
      continue;
    }

    snake.segments = foodIdx >= 0 ? [next, ...snake.segments] : [next, ...snake.segments.slice(0, -1)];
    if (foodIdx >= 0) {
      const food = world.food[foodIdx]!;
      world.food.splice(foodIdx, 1);
      let mult = world.config.rewardRate * (world.expMultiplier ?? 1);
      if (food.kind === "golden_apple") mult *= 5;
      if (snake.powerUp?.kind === "double_score") mult *= 2;
      snake.score += Math.round(food.value * mult);
      snake.foodEaten = (snake.foodEaten ?? 0) + 1;
      world.objective.progress[snake.deviceId] = (world.objective.progress[snake.deviceId] ?? 0) + 1;
      spawnFoodItems(world, 1);
    }
  }

  tickBoss(world);
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

export function spawnEventFood(world: SnakeIoWorld, event: WorldEvent): void {
  const kindMap: Record<string, FoodKind> = {
    golden_apple: "golden_apple",
    meteor_shower: "meteor",
    black_hole: "black_hole",
    boss_snake: "golden_apple",
    treasure_chest: "normal",
    double_exp: "golden_apple",
    food_storm: "normal",
    treasure_rain: "golden_apple",
    boss_spawn: "golden_apple",
    team_battle: "normal",
    survival: "meteor",
    portal_open: "normal",
  };
  const kind = kindMap[event.kind] ?? "normal";
  const value = event.kind === "golden_apple" || event.kind === "double_exp" ? 50
    : event.kind === "boss_snake" || event.kind === "boss_spawn" ? 40
    : event.kind === "treasure_rain" ? 35 : 25;
  const count = event.kind === "meteor_shower" ? 5
    : event.kind === "food_storm" ? 24
    : event.kind === "treasure_rain" ? 18
    : event.kind === "team_battle" ? 12 : 3;
  for (let i = 0; i < count; i++) {
    const x = event.x + Math.floor(Math.random() * event.radius * 2) - event.radius;
    const y = event.y + Math.floor(Math.random() * event.radius * 2) - event.radius;
    if (!occupied(world, { x, y }) && !isBlocked(world, { x, y })) {
      world.food.push({ x, y, kind, value });
    }
  }
}

export function applyBlackHolePull(world: SnakeIoWorld, event: WorldEvent): void {
  if (event.kind !== "black_hole") return;
  for (const snake of Object.values(world.snakes)) {
    if (!snake.alive || !snake.segments[0]) continue;
    const head = snake.segments[0];
    const dx = event.x - head.x;
    const dy = event.y - head.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0 && dist < event.radius * 2) {
      snake.pendingDirection = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    }
  }
}

export { spawnWorldBoss };
export function getDeathPosition(snake: SnakeEntity): Vec | null {
  return snake.segments[0] ?? null;
}
