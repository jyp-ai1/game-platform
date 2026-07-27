/** Snake.io world engine — balance-aware multi-snake realtime. */
import { BossEngine, type BossEncounter } from "@game-platform/replay-engine/balance";
import type { ActivePowerUp, ComputedBalance, FoodKind, MatchObjective, ReplayMoment, WorldEvent, WorldFeature } from "@game-platform/shared";

import type { LivingWorldState } from "./snake-living-world";
import { FOOD_TIERS, rollFoodTier, type FoodTier } from "./snake-food-types";
import { SNAKE_FEEL, SNAKE_POLISH } from "./snake-feel-tuning";
import {
  advanceSnakePath,
  directionToAngle,
  ensureSnakePath,
  getSegmentCount,
  initSnakePath,
  syncSegmentsFromPath,
} from "./snake-path-movement";

export type { FoodKind };

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
  tier?: FoodTier;
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
  boosting?: boolean;
  hp?: number;
  lastKillerId?: string;
  aliveSinceTick?: number;
  totalKills?: number;
  isBot?: boolean;
  botDifficulty?: "easy" | "normal" | "hunter" | "legend";
  botRole?: "explorer" | "hunter" | "farmer" | "aggressive" | "scavenger";
  /** Per-bot desync — fake crowd prevention */
  botPhase?: number;
  botSeed?: number;
  /** Gems eaten — every 2 gems = +1 body segment */
  gemsEaten?: number;
  /** Boost energy gauge (0–100) */
  boostEnergy?: number;
  /** @deprecated use gemsEaten % 2 for HUD */
  growthBuffer?: number;
  /** Client-side growth pulse timestamp (ms) — set on eat */
  lastGrowthAt?: number;
  /** Float head + path follow (slither-like) */
  headX?: number;
  headY?: number;
  angle?: number;
  desiredAngle?: number;
  path?: Vec[];
  segmentCount?: number;
  /** Bot FSM state */
  botState?: "search" | "chase" | "escape" | "boost" | "wander";
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
  killFeed: KillFeedEntry[];
  living?: LivingWorldState;
}

export interface KillFeedEntry {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  tick: number;
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
  const m = 2;
  return {
    x: m + Math.random() * (worldSize - m * 2),
    y: m + Math.random() * (worldSize - m * 2),
  };
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
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

function occupied(world: SnakeIoWorld, pos: Vec, minDist = 1.2): boolean {
  for (const snake of Object.values(world.snakes)) {
    if (!snake.alive || snake.spectating) continue;
    ensureSnakePath(snake);
    if (snake.segments.some((s) => dist(s, pos) < minDist)) return true;
  }
  return world.food.some((f) => dist(f, pos) < 0.8);
}

export function spawnFoodItems(world: SnakeIoWorld, count = 1): void {
  const n = Math.max(1, Math.round(count * SNAKE_POLISH.foodDensityMult));
  const w = world.config.worldSize;
  for (let i = 0; i < n; i++) {
    let pos = randPos(w);
    let tries = 0;
    while ((occupied(world, pos) || isBlocked(world, pos)) && tries < 100) {
      pos = randPos(w);
      tries++;
    }
    const tier = rollFoodTier();
    const cfg = FOOD_TIERS[tier];
    world.food.push({
      x: pos.x,
      y: pos.y,
      kind: cfg.kind,
      value: cfg.score,
      tier,
    });
  }
}

/** Grow logical segment count — body follows path automatically */
function growSnakeSegments(snake: SnakeEntity, extra: number): void {
  if (extra <= 0) return;
  snake.segmentCount = getSegmentCount(snake) + extra;
  syncSegmentsFromPath(snake);
  snake.lastGrowthAt = Date.now();
}

function applyGemGrowth(snake: SnakeEntity): void {
  snake.gemsEaten = (snake.gemsEaten ?? 0) + 1;
  snake.growthBuffer = snake.gemsEaten % 2;
  if (snake.gemsEaten % 2 === 0) {
    growSnakeSegments(snake, 1);
  }
}

function spawnWorldBoss(world: SnakeIoWorld): void {
  if (world.boss || world.bossSpawned || !world.config.bossEventsEnabled) return;
  const kind = world.config.environment.activeBoss;
  if (!kind) return;
  world.boss = BossEngine.spawn(kind, world.config.worldSize);
  world.boss = {
    ...world.boss,
    maxHp: Math.round(world.boss.maxHp * SNAKE_POLISH.bossHpMult),
    hp: Math.round(world.boss.hp * SNAKE_POLISH.bossHpMult),
  };
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
      world.boss = BossEngine.damage(boss, SNAKE_POLISH.bossDamagePerHit);
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
      x: margin + Math.random() * (w - margin * 2),
      y: margin + Math.random() * (w - margin * 2),
    };
    if (occupied(world, pos) || isBlocked(world, pos)) continue;
    const tooClose = enemies.some((e) => Math.hypot(e.x - pos.x, e.y - pos.y) < minDist);
    if (tooClose) continue;
    const inCamp = recentDeaths.some((d) => Math.hypot(d.x - pos.x, d.y - pos.y) < campRadius);
    if (inCamp) continue;
    return pos;
  }
  return { x: w / 2, y: w / 2 };
}

function finalizeSnake(
  snake: SnakeEntity,
  pos: Vec,
  segmentCount: number,
  angle = 0
): SnakeEntity {
  snake.segmentCount = segmentCount;
  initSnakePath(snake, pos.x, pos.y, angle);
  return snake;
}

export function createSnakeAt(
  deviceId: string,
  nickname: string,
  index: number,
  world: SnakeIoWorld,
  pos: Vec,
  segmentCount = 3,
  opts?: { score?: number; isBot?: boolean; botRole?: SnakeEntity["botRole"] }
): SnakeEntity {
  const snake: SnakeEntity = {
    deviceId,
    nickname,
    segments: [{ x: pos.x, y: pos.y }],
    direction: "right",
    pendingDirection: "right",
    score: opts?.score ?? 0,
    alive: true,
    color: COLORS[index % COLORS.length]!,
    invincibleUntil: Date.now() + world.config.spawnShieldMs,
    hp: 100,
    gemsEaten: 0,
    aliveSinceTick: world.tick,
    totalKills: 0,
    isBot: opts?.isBot,
    botRole: opts?.botRole,
  };
  return finalizeSnake(snake, pos, segmentCount, 0);
}

export function createSnake(
  deviceId: string,
  nickname: string,
  index: number,
  world: SnakeIoWorld,
  segmentCount = 3
): SnakeEntity {
  const pos = findSafePosition(world, deviceId);
  const snake: SnakeEntity = {
    deviceId,
    nickname,
    segments: [{ x: pos.x, y: pos.y }],
    direction: "right",
    pendingDirection: "right",
    score: 0,
    alive: true,
    color: COLORS[index % COLORS.length]!,
    invincibleUntil: Date.now() + world.config.spawnShieldMs,
    hp: 100,
    gemsEaten: 0,
    aliveSinceTick: world.tick,
    totalKills: 0,
  };
  return finalizeSnake(snake, pos, segmentCount, 0);
}

export function applyMatchIdentity(world: SnakeIoWorld): void {
  const rule = world.living?.matchRule;
  if (!rule) return;
  world.objective.target = rule.scoreTarget;
  for (const [i, snake] of Object.entries(world.snakes)) {
    const idx = Object.keys(world.snakes).indexOf(i);
    const segs = rule.startingSegments;
    if (getSegmentCount(snake) < segs) {
      snake.segmentCount = segs;
      syncSegmentsFromPath(snake);
    }
    world.snakes[i] = snake;
    void idx;
  }
  const extra = Math.round(world.config.foodCount * (rule.foodDensityMult - 1));
  if (extra > 0) spawnFoodItems(world, extra);
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
    killFeed: [],
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
  snake.desiredAngle = directionToAngle(direction);
}

export function setBoost(world: SnakeIoWorld, deviceId: string, boosting: boolean): void {
  const snake = world.snakes[deviceId];
  if (!snake || !snake.alive || snake.spectating) return;
  snake.boosting = boosting && getSegmentCount(snake) > SNAKE_FEEL.boostMinSegments;
}

function applyFoodMagnet(world: SnakeIoWorld, snake: SnakeEntity): void {
  if (!snake.alive || !snake.segments[0]) return;
  const head = snake.segments[0];
  const radius = snake.boosting ? SNAKE_FEEL.magnetRadiusBoost : SNAKE_FEEL.magnetRadius;
  for (const food of world.food) {
    const d = dist(food, head);
    if (d <= 0.05 || d > radius) continue;
    const pull = snake.boosting ? 0.35 : 0.22;
    food.x += (head.x - food.x) * pull;
    food.y += (head.y - food.y) * pull;
  }
}

function moveSnakePath(world: SnakeIoWorld, snake: SnakeEntity, now: number, speed: number): boolean {
  ensureSnakePath(snake);
  snake.desiredAngle = directionToAngle(snake.pendingDirection);
  advanceSnakePath(snake, speed);

  const head = snake.segments[0];
  if (!head) return false;

  const w = world.config.worldSize;
  if (head.x < 0.2 || head.y < 0.2 || head.x >= w - 0.2 || head.y >= w - 0.2 || isBlocked(world, head)) {
    killSnake(snake, world.config, world);
    return false;
  }

  const cr = SNAKE_FEEL.collisionRadius;
  const pickup = SNAKE_FEEL.foodPickupRadius;
  let foodIdx = -1;
  let bestFoodD: number = pickup;
  for (let i = 0; i < world.food.length; i++) {
    const f = world.food[i]!;
    const fd = dist(f, head);
    if (fd < bestFoodD) {
      bestFoodD = fd;
      foodIdx = i;
    }
  }

  const bodyCheck = foodIdx >= 0 ? snake.segments : snake.segments.slice(0, -1);
  const hitSelf = bodyCheck.slice(3).some((s) => dist(s, head) < cr * 1.6);
  let killer: SnakeEntity | undefined;
  const hitOther = Object.values(world.snakes).some((other) => {
    if (!other.alive || other.spectating || other.deviceId === snake.deviceId) return false;
    if (other.invincibleUntil && now < other.invincibleUntil) return false;
    const hit = other.segments.some((s) => dist(s, head) < cr * 1.8);
    if (hit) killer = other;
    return hit;
  });

  if (hitSelf || hitOther) {
    if (killer) {
      killer.killStreak = (killer.killStreak ?? 0) + 1;
      killer.totalKills = (killer.totalKills ?? 0) + 1;
      snake.killStreak = 0;
      snake.lastKillerId = killer.deviceId;
    }
    killSnake(snake, world.config, world, killer);
    return false;
  }

  if (foodIdx >= 0) {
    const food = world.food[foodIdx]!;
    world.food.splice(foodIdx, 1);
    let mult = world.config.rewardRate * (world.expMultiplier ?? 1);
    if (food.kind === "golden_apple") mult *= 1.5;
    if (snake.powerUp?.kind === "double_score") mult *= 2;
    const baseScore = food.value || FOOD_TIERS.small.score;
    snake.score += Math.round(baseScore * mult);
    snake.foodEaten = (snake.foodEaten ?? 0) + 1;
    world.objective.progress[snake.deviceId] = (world.objective.progress[snake.deviceId] ?? 0) + 1;
    applyGemGrowth(snake);
    spawnFoodItems(world, 1);
  }
  return true;
}

function dropFoodFromSnake(world: SnakeIoWorld, snake: SnakeEntity): void {
  if (snake.segments.length === 0) return;
  const maxFood = Math.floor(world.config.foodCount * 2);
  const cfg = FOOD_TIERS.death;
  const step = Math.max(1, Math.floor(snake.segments.length / 28));

  for (let i = 0; i < snake.segments.length; i += step) {
    if (world.food.length >= maxFood) break;
    const seg = snake.segments[i]!;
    if (world.food.some((f) => dist(f, seg) < 0.5)) continue;
    world.food.push({
      x: seg.x,
      y: seg.y,
      kind: cfg.kind,
      value: cfg.score,
      tier: "death",
    });
  }
}

function dropBoostTailFood(world: SnakeIoWorld, snake: SnakeEntity): void {
  const tail = snake.segments[snake.segments.length - 1];
  if (!tail) return;
  const cfg = FOOD_TIERS.small;
  world.food.push({ x: tail.x, y: tail.y, kind: cfg.kind, value: cfg.score, tier: "small" });
}

function killSnake(
  snake: SnakeEntity,
  config: ComputedBalance,
  world: SnakeIoWorld,
  killer?: SnakeEntity
): void {
  const head = snake.segments[0];
  if (head && config.antiCampEnabled) {
    world.deathZones = [...world.deathZones.filter((d) => Date.now() - d.at < 30_000), { x: head.x, y: head.y, at: Date.now() }].slice(-40);
  }
  dropFoodFromSnake(world, snake);
  if (killer && killer.deviceId !== snake.deviceId) {
    world.killFeed = [
      {
        killerId: killer.deviceId,
        killerName: killer.nickname,
        victimId: snake.deviceId,
        victimName: snake.nickname,
        tick: world.tick,
      },
      ...world.killFeed,
    ].slice(0, 12);
  }
  snake.alive = false;
  snake.spectating = true;
  snake.respawnAt = Date.now() + config.respawnMs;
}

/** Natural bot retirement — death + food drop, removed from world (no respawn) */
export function retireSnakeNaturally(world: SnakeIoWorld, snake: SnakeEntity): void {
  const head = snake.segments[0];
  if (head) {
    world.deathZones = [...world.deathZones.filter((d) => Date.now() - d.at < 30_000), { x: head.x, y: head.y, at: Date.now() }].slice(-40);
  }
  dropFoodFromSnake(world, snake);
  delete world.snakes[snake.deviceId];
}

function respawnSnake(world: SnakeIoWorld, snake: SnakeEntity, index: number, now: number): void {
  const pos = findSafePosition(world, snake.deviceId);
  snake.score = Math.max(0, snake.score - Math.round(20 * world.config.rewardRate));
  snake.color = COLORS[index % COLORS.length]!;
  snake.respawnAt = undefined;
  snake.invincibleUntil = now + world.config.spawnShieldMs;
  snake.hp = 100;
  snake.gemsEaten = snake.gemsEaten ?? 0;
  snake.boosting = false;
  snake.alive = true;
  snake.spectating = false;
  snake.aliveSinceTick = world.tick;
  finalizeSnake(snake, pos, 3, 0);
}

/** Full player restart — Retry: reset score/hp/snake, respawn, ready to play */
export function restartPlayerSnake(
  world: SnakeIoWorld,
  deviceId: string,
  nickname: string
): void {
  const keys = Object.keys(world.snakes);
  const idx = keys.indexOf(deviceId);
  let snake = world.snakes[deviceId];
  const now = Date.now();
  if (!snake) {
    world.snakes[deviceId] = createSnake(deviceId, nickname, Math.max(0, idx), world);
    updateRankings(world);
    return;
  }
  const pos = findSafePosition(world, deviceId);
  snake.score = 0;
  snake.hp = 100;
  snake.alive = true;
  snake.spectating = false;
  snake.boosting = false;
  snake.gemsEaten = 0;
  snake.growthBuffer = 0;
  snake.respawnAt = undefined;
  snake.invincibleUntil = now + Math.min(world.config.spawnShieldMs, 800);
  snake.aliveSinceTick = world.tick;
  snake.killStreak = 0;
  snake.foodEaten = 0;
  snake.lastKillerId = undefined;
  snake.nickname = nickname;
  finalizeSnake(snake, pos, 3, 0);
  updateRankings(world);
}

export function damageSnake(world: SnakeIoWorld, snake: SnakeEntity, amount: number): void {
  if (!snake.alive || snake.spectating) return;
  snake.hp = Math.max(0, (snake.hp ?? 100) - amount);
  if (snake.hp <= 0) killSnake(snake, world.config, world);
}

export function tickWorld(world: SnakeIoWorld, now = Date.now()): SnakeIoWorld {
  world.tick += 1;

  if (world.food.length < world.config.foodCount * 0.6) {
    spawnFoodItems(world, Math.min(15, Math.ceil((world.config.foodCount - world.food.length) * 0.2)));
  }

  for (const [i, snake] of Object.entries(world.snakes)) {
    const idx = Object.keys(world.snakes).indexOf(i);
    if (!snake.alive) {
      const canRespawn = world.living?.matchRule.respawnEnabled ?? true;
      if (canRespawn && snake.respawnAt && now >= snake.respawnAt) respawnSnake(world, snake, idx, now);
      continue;
    }

    applyFoodMagnet(world, snake);
    const boostActive = snake.boosting && getSegmentCount(snake) > SNAKE_FEEL.boostMinSegments;
    const speed = SNAKE_FEEL.baseSpeed * (boostActive ? SNAKE_FEEL.boostSpeedMult : 1);
    moveSnakePath(world, snake, now, speed);

    if (boostActive && snake.alive) {
      if (world.tick % SNAKE_FEEL.boostTailDropEvery === 0) {
        const count = getSegmentCount(snake);
        if (count > SNAKE_FEEL.boostMinSegments) {
          snake.segmentCount = count - 1;
          dropBoostTailFood(world, snake);
          syncSegmentsFromPath(snake);
        } else {
          snake.boosting = false;
        }
      }
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

export function getSpectatorTarget(
  world: SnakeIoWorld | null | undefined,
  preferDeviceId?: string,
  friendIds?: string[]
): string | null {
  if (!world) return null;
  if (preferDeviceId && world.snakes[preferDeviceId]?.alive) return preferDeviceId;
  if (friendIds?.length) {
    const friend = friendIds.find((id) => world.snakes[id]?.alive);
    if (friend) return friend;
  }
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
    const d = Math.hypot(dx, dy);
    if (d > 0 && d < event.radius * 2) {
      snake.pendingDirection = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      snake.desiredAngle = directionToAngle(snake.pendingDirection);
    }
  }
}

export { spawnWorldBoss };

/** Force a world event every ~2 min — "이번 판은 다르네" */
export function createScheduledEvent(world: SnakeIoWorld, playerCount: number): WorldEvent | null {
  if (playerCount < 2 || world.tick % 1200 !== 0) return null;
  const pool = ["meteor_shower", "food_storm", "double_exp", "golden_apple", "treasure_rain", "boss_spawn"] as const;
  const kind = pool[Math.floor(world.tick / 1200) % pool.length]!;
  const now = Date.now();
  const w = world.config.worldSize;
  const cfg: Record<string, { durationMs: number; radius: number }> = {
    meteor_shower: { durationMs: 18_000, radius: 10 },
    food_storm: { durationMs: 22_000, radius: 14 },
    double_exp: { durationMs: 30_000, radius: 12 },
    golden_apple: { durationMs: 25_000, radius: 3 },
    treasure_rain: { durationMs: 22_000, radius: 14 },
    boss_spawn: { durationMs: 60_000, radius: 8 },
  };
  const c = cfg[kind] ?? { durationMs: 20_000, radius: 8 };
  return {
    id: `sched-${world.tick}`,
    kind,
    x: Math.floor(w / 2) + Math.floor(Math.random() * 20 - 10),
    y: Math.floor(w / 2) + Math.floor(Math.random() * 20 - 10),
    radius: c.radius,
    startedAt: now,
    expiresAt: now + c.durationMs,
    announced: true,
  };
}

export function lerpSegments(
  prev: Vec[] | undefined,
  curr: Vec[],
  alpha: number,
  headAlpha?: number,
  waveAmp: number = SNAKE_FEEL.tailWaveAmp
): Vec[] {
  const headMix = headAlpha ?? alpha;
  return curr.map((c, i) => {
    const p = prev?.[i] ?? c;
    const mix = i === 0 ? headMix : alpha;
    const wave =
      i > 0 && curr.length > 2
        ? Math.sin((i + alpha * 10) * 0.45) * waveAmp * (i / curr.length)
        : 0;
    return {
      x: p.x + (c.x - p.x) * mix + wave,
      y: p.y + (c.y - p.y) * mix,
    };
  });
}

export function directionAngle(dir: Direction): number {
  return (directionToAngle(dir) * 180) / Math.PI;
}

export { captureSnakeSnapshot, interpolateSnakeRender, getSegmentCount } from "./snake-path-movement";

export function getDeathPosition(snake: SnakeEntity): Vec | null {
  return snake.segments[0] ?? null;
}
