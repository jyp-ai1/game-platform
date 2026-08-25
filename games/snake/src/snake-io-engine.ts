/** Snake.io world engine — balance-aware multi-snake realtime. */
import { BossEngine, type BossEncounter } from "@game-platform/replay-engine/balance";
import type { ActivePowerUp, ComputedBalance, FoodKind, MatchObjective, ReplayMoment, WorldEvent, WorldFeature } from "@game-platform/shared";

import type { LivingWorldState } from "./snake-living-world";
import { FOOD_TIERS, rollFoodTier, type FoodTier } from "./snake-food-types";
import { SNAKE_MVP_RC1 } from "./snake-mvp-rc1";
import { SNAKE_FEEL, SNAKE_POLISH } from "./snake-feel-tuning";
import { deathTrace } from "./snake-death-trace";
import { death003 } from "./snake-death-003-trace";
import { death004Sample } from "./snake-death-004-trace";
import { noteFixDeath001Sample } from "./snake-fix-death-001";
import { noteFixDeath001Approach } from "./snake-fix-death-001-step2";
import { noteExecOrder } from "./snake-exec-order-trace";
import { noteDeath005 } from "./snake-death-005-trace";
import { noteDeath006Respawn, noteDeath006Timer } from "./snake-death-006-trace";
import { noteLoot001Collect, noteLoot001Drop } from "./snake-loot-001-trace";
import {
  advanceSnakePath,
  directionToAngle,
  ensureSnakePath,
  getSegmentCount,
  initSnakePath,
  syncSegmentsFromPath,
} from "./snake-path-movement";

export type { FoodKind };

function isBotEntity(snake: SnakeEntity): boolean {
  return !!snake.isBot || snake.deviceId.startsWith("bot:");
}

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
  /** Stable React key — FIX-PERF-001 */
  id?: number;
}

let foodIdSeq = 1;
function nextFoodId(): number {
  foodIdSeq += 1;
  return foodIdSeq;
}

/**
 * FIX-PERF-001: hard-cap ambient food toward config.foodCount.
 * Death-tier corpse gems are always preserved (FIX-LOOT-001).
 */
export function cullAmbientFood(world: SnakeIoWorld, ambientCap = world.config.foodCount): void {
  const cap = Math.max(0, Math.floor(ambientCap));
  let ambient = 0;
  for (const f of world.food) {
    if (f.tier !== "death") ambient += 1;
  }
  if (ambient <= cap) return;

  const death: FoodItem[] = [];
  const keep: FoodItem[] = [];
  // Prefer newer ambient (tail of array) — death loot appended last stays intact via death bucket.
  for (let i = world.food.length - 1; i >= 0; i--) {
    const f = world.food[i]!;
    if (f.tier === "death") {
      death.push(f);
    } else if (keep.length < cap) {
      keep.push(f);
    }
  }
  death.reverse();
  keep.reverse();
  world.food = death.length ? [...death, ...keep] : keep;
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
  /** RC5 — hold movement until first direction input (local human) */
  awaitingInput?: boolean;
  /** Sprint 8 — head character id (emoji sprite on head segment) */
  headCharacter?: string;
  /** Sprint 8.2 — body appearance (pattern unlocks later via progression) */
  bodyColor?: string;
  bodyColorAlt?: string;
  bodyPattern?: string;
  /** Sprint 8.1 — cumulative thickness from eating (1.0 … 1.4) */
  bodyRadiusScale?: number;
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
  /** Client fade clock (ms since epoch) */
  at?: number;
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
  // FIX-PERF-001: never grow ambient past designed density (foodDensityMult used to 2× overrun).
  let ambient = 0;
  for (const f of world.food) {
    if (f.tier !== "death") ambient += 1;
  }
  const room = Math.max(0, world.config.foodCount - ambient);
  if (room <= 0) return;
  const wanted = Math.max(1, Math.round(count * SNAKE_POLISH.foodDensityMult));
  const n = Math.min(room, wanted);
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
      id: nextFoodId(),
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
  snake.growthBuffer = snake.gemsEaten % SNAKE_MVP_RC1.growthFoodPerSegment;
  const scale = snake.bodyRadiusScale ?? 1;
  snake.bodyRadiusScale = Math.min(
    SNAKE_MVP_RC1.bodyRadiusMax,
    scale + SNAKE_MVP_RC1.bodyRadiusPerFood
  );
  if (snake.gemsEaten % SNAKE_MVP_RC1.growthFoodPerSegment === 0) {
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
    invincibleUntil: Date.now() + SNAKE_MVP_RC1.spawnSafeMs,
    hp: 100,
    gemsEaten: 0,
    bodyRadiusScale: 1,
    aliveSinceTick: world.tick,
    totalKills: 0,
    isBot: opts?.isBot,
    botRole: opts?.botRole,
    awaitingInput: opts?.isBot ? undefined : true,
  };
  return finalizeSnake(snake, pos, segmentCount, 0);
}

export function createSnake(
  deviceId: string,
  nickname: string,
  index: number,
  world: SnakeIoWorld,
  segmentCount = SNAKE_MVP_RC1.startingSegments
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
    invincibleUntil: Date.now() + SNAKE_MVP_RC1.spawnSafeMs,
    hp: 100,
    gemsEaten: 0,
    bodyRadiusScale: 1,
    aliveSinceTick: world.tick,
    totalKills: 0,
    awaitingInput: true,
  };
  return finalizeSnake(snake, pos, segmentCount, 0);
}

export function applyMatchIdentity(world: SnakeIoWorld): void {
  const rule = world.living?.matchRule;
  if (!rule) return;
  world.objective.target = rule.scoreTarget;
  for (const [i, snake] of Object.entries(world.snakes)) {
    const idx = Object.keys(world.snakes).indexOf(i);
    const segs = SNAKE_MVP_RC1.startingSegments;
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

export function rehydrateWorldSnakes(world: SnakeIoWorld): void {
  for (const snake of Object.values(world.snakes)) {
    ensureSnakePath(snake);
  }
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
    const close = d < radius * 0.35;
    const pull = close
      ? SNAKE_FEEL.magnetPullClose
      : snake.boosting
        ? SNAKE_FEEL.magnetPull * 1.15
        : SNAKE_FEEL.magnetPull;
    food.x += (head.x - food.x) * pull;
    food.y += (head.y - food.y) * pull;
  }
}

function moveSnakePath(world: SnakeIoWorld, snake: SnakeEntity, now: number, speed: number): boolean {
  ensureSnakePath(snake);
  snake.desiredAngle = directionToAngle(snake.pendingDirection);
  advanceSnakePath(snake, speed);
  // Physical turn+move this frame (after bot brain turn intent)
  if (world.tick % 8 === 0) {
    noteExecOrder("steering", world.tick, snake.deviceId, {
      angle: snake.angle ?? null,
      pending: snake.pendingDirection,
      isBot: isBotEntity(snake),
    });
  }

  const head = snake.segments[0];
  if (!head) return false;

  // FIX-DEATH-001 Step1: physics seg0 vs headX/Y identity (human only, throttled)
  if (!isBotEntity(snake) && world.tick % 8 === 0) {
    const headXY =
      snake.headX != null && snake.headY != null ? { x: snake.headX, y: snake.headY } : null;
    const deltaPhysicsVsHeadXY =
      headXY != null ? Math.hypot(head.x - headXY.x, head.y - headXY.y) : null;
    noteFixDeath001Sample({
      tick: world.tick,
      deviceId: snake.deviceId,
      physicsSeg0: { x: head.x, y: head.y },
      headXY,
      deltaPhysicsVsHeadXY,
      renderHead: null,
      deltaPhysicsVsRender: null,
    });
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

  let killer: SnakeEntity | undefined;
  let nearestBodyD = Number.POSITIVE_INFINITY;
  let nearestBodyId: string | undefined;
  let nearestSeg: Vec | undefined;
  let nearestSegIndex = -1;
  const humanVictim = !isBotEntity(snake);
  const traceHumans = humanVictim && (world.tick % 8 === 0);
  const collisionThreshold = cr * 1.8;

  if (traceHumans) {
    noteExecOrder("collision", world.tick, snake.deviceId, {
      threshold: collisionThreshold,
      head: { x: head.x, y: head.y },
    });
    death003("evaluator_enter", {
      tick: world.tick,
      victimId: snake.deviceId,
      detail: {
        snakesTotal: Object.keys(world.snakes).length,
        invincibleUntil: snake.invincibleUntil ?? null,
        now,
        threshold: collisionThreshold,
        head: { x: head.x, y: head.y },
      },
    });
  }

  const hitOther = Object.values(world.snakes).some((other) => {
    // --- RC-DEATH-003 observe reject path (human victims only) — outcome unchanged ---
    if (humanVictim && traceHumans) {
      if (!other.alive) {
        death003("reject", {
          tick: world.tick,
          victimId: snake.deviceId,
          otherId: other.deviceId,
          reason: "other_not_alive",
        });
        return false;
      }
      if (other.spectating) {
        death003("reject", {
          tick: world.tick,
          victimId: snake.deviceId,
          otherId: other.deviceId,
          reason: "other_spectating",
        });
        return false;
      }
      if (other.deviceId === snake.deviceId) {
        death003("reject", {
          tick: world.tick,
          victimId: snake.deviceId,
          otherId: other.deviceId,
          reason: "self",
        });
        return false;
      }
      death003("candidate", {
        tick: world.tick,
        victimId: snake.deviceId,
        otherId: other.deviceId,
        detail: { otherBot: isBotEntity(other), segments: other.segments.length },
      });
      if (other.invincibleUntil && now < other.invincibleUntil) {
        death003("reject", {
          tick: world.tick,
          victimId: snake.deviceId,
          otherId: other.deviceId,
          reason: "other_invincible",
          detail: { remainingMs: other.invincibleUntil - now },
        });
        return false;
      }
      if (other.segments.length <= 1) {
        death003("reject", {
          tick: world.tick,
          victimId: snake.deviceId,
          otherId: other.deviceId,
          reason: "body_empty",
          detail: { segments: other.segments.length },
        });
        return false;
      }
      let best = Number.POSITIVE_INFINITY;
      let bestSeg: Vec | undefined;
      let bestIdx = -1;
      for (let i = 1; i < other.segments.length; i++) {
        const seg = other.segments[i]!;
        const d = dist(seg, head);
        if (d < best) {
          best = d;
          bestSeg = seg;
          bestIdx = i;
        }
      }
      death003("evaluate", {
        tick: world.tick,
        victimId: snake.deviceId,
        otherId: other.deviceId,
        detail: { nearestBodyD: best, threshold: collisionThreshold, hit: best < collisionThreshold },
      });
      if (best < nearestBodyD) {
        nearestBodyD = best;
        nearestBodyId = other.deviceId;
        nearestSeg = bestSeg;
        nearestSegIndex = bestIdx;
      }
      const hit = best < collisionThreshold;
      if (!hit) {
        death003("reject", {
          tick: world.tick,
          victimId: snake.deviceId,
          otherId: other.deviceId,
          reason: "distance_gt_threshold",
          detail: { nearestBodyD: best, threshold: collisionThreshold },
        });
        return false;
      }
      death003("hit", {
        tick: world.tick,
        victimId: snake.deviceId,
        otherId: other.deviceId,
        detail: { nearestBodyD: best, threshold: collisionThreshold },
      });
      killer = other;
      return true;
    }

    // --- original path (bots + non-trace ticks) — identical gates ---
    if (!other.alive || other.spectating || other.deviceId === snake.deviceId) return false;
    if (other.invincibleUntil && now < other.invincibleUntil) return false;
    let best = Number.POSITIVE_INFINITY;
    let bestSeg: Vec | undefined;
    let bestIdx = -1;
    for (let i = 1; i < other.segments.length; i++) {
      const seg = other.segments[i]!;
      const d = dist(seg, head);
      if (d < best) {
        best = d;
        bestSeg = seg;
        bestIdx = i;
      }
    }
    if (best < nearestBodyD) {
      nearestBodyD = best;
      nearestBodyId = other.deviceId;
      nearestSeg = bestSeg;
      nearestSegIndex = bestIdx;
    }
    const hit = best < collisionThreshold;
    if (hit) killer = other;
    return hit;
  });

  // RC-DEATH-004: once per human trace tick, dump nearest compare fields (no gameplay change)
  if (traceHumans && nearestSeg && nearestBodyId && Number.isFinite(nearestBodyD)) {
    death004Sample({
      tick: world.tick,
      victimId: snake.deviceId,
      otherId: nearestBodyId,
      head: { x: head.x, y: head.y },
      segment: { x: nearestSeg.x, y: nearestSeg.y },
      distance: nearestBodyD,
      threshold: collisionThreshold,
      headRadius: SNAKE_FEEL.headRadius,
      segmentRadius: SNAKE_FEEL.bodyRadius,
      collisionRadius: SNAKE_FEEL.collisionRadius,
      thresholdFormula: "collisionRadius * 1.8",
      worldSize: world.config.worldSize,
      detail: {
        foodPickupRadius: SNAKE_FEEL.foodPickupRadius,
        segmentSpacing: SNAKE_FEEL.segmentSpacing,
      },
    });
  }

  // FIX-DEATH-001 Step2: approach floor (independent scan — invincible included; no gameplay effect)
  if (traceHumans) {
    let obsBody = Number.POSITIVE_INFINITY;
    let obsId: string | undefined;
    let obsIdx = -1;
    let obsOther: SnakeEntity | undefined;
    for (const other of Object.values(world.snakes)) {
      if (!other.alive || other.spectating || other.deviceId === snake.deviceId) continue;
      for (let i = 1; i < other.segments.length; i++) {
        const seg = other.segments[i]!;
        const d = dist(seg, head);
        if (d < obsBody) {
          obsBody = d;
          obsId = other.deviceId;
          obsIdx = i;
          obsOther = other;
        }
      }
    }
    if (obsId && obsOther && Number.isFinite(obsBody)) {
      const oh = obsOther.segments[0];
      const nseg = obsIdx >= 0 ? obsOther.segments[obsIdx] : null;
      noteFixDeath001Approach({
        tick: world.tick,
        now,
        threshold: collisionThreshold,
        selfId: snake.deviceId,
        selfHead: { x: head.x, y: head.y },
        selfAngle: snake.angle ?? null,
        selfInvincibleUntil: snake.invincibleUntil,
        nearestBodyDist: obsBody,
        nearestBodyId: obsId,
        nearestSegIndex: obsIdx,
        nearestSeg: nseg ? { x: nseg.x, y: nseg.y } : null,
        other: {
          id: obsOther.deviceId,
          isBot: isBotEntity(obsOther),
          head: oh ? { x: oh.x, y: oh.y } : null,
          angle: obsOther.angle ?? null,
          invincibleUntil: obsOther.invincibleUntil,
          botState: obsOther.botState ?? null,
        },
      });
    }
  }
  // Trace near-miss for humans (throttled) — observe approach without changing collision
  if (!isBotEntity(snake) && nearestBodyD < cr * 4 && world.tick % 8 === 0) {
    deathTrace("near_miss", {
      tick: world.tick,
      victimId: snake.deviceId,
      victimBot: false,
      killerId: nearestBodyId,
      killerBot: nearestBodyId ? nearestBodyId.startsWith("bot:") : undefined,
      detail: { nearestBodyD, threshold: collisionThreshold, invincibleUntil: snake.invincibleUntil ?? null, now },
    });
  }

  if (hitOther) {
    deathTrace("collision_detect", {
      tick: world.tick,
      victimId: snake.deviceId,
      victimBot: isBotEntity(snake),
      killerId: killer?.deviceId,
      killerBot: killer ? isBotEntity(killer) : undefined,
      detail: {
        nearestBodyD,
        threshold: collisionThreshold,
        victimInvincible: !!(snake.invincibleUntil && now < snake.invincibleUntil),
        invincibleUntil: snake.invincibleUntil ?? null,
        now,
      },
    });
  }

  if (hitOther && !(snake.invincibleUntil && now < snake.invincibleUntil)) {
    if (killer) {
      killer.killStreak = (killer.killStreak ?? 0) + 1;
      killer.totalKills = (killer.totalKills ?? 0) + 1;
      snake.killStreak = 0;
      snake.lastKillerId = killer.deviceId;
    }
    if (humanVictim) {
      death003("kill_snake_call", {
        tick: world.tick,
        victimId: snake.deviceId,
        otherId: killer?.deviceId,
        detail: { nearestBodyD, threshold: collisionThreshold },
      });
    }
    noteExecOrder("killSnake", world.tick, snake.deviceId, {
      killerId: killer?.deviceId,
      nearestBodyD,
      isBot: isBotEntity(snake),
    });
    killSnake(snake, world.config, world, killer);
    return false;
  }

  if (hitOther && snake.invincibleUntil && now < snake.invincibleUntil) {
    deathTrace("invincible_block", {
      tick: world.tick,
      victimId: snake.deviceId,
      victimBot: isBotEntity(snake),
      killerId: killer?.deviceId,
      killerBot: killer ? isBotEntity(killer) : undefined,
      detail: { invincibleUntil: snake.invincibleUntil, now, remainingMs: snake.invincibleUntil - now },
    });
    if (humanVictim) {
      death003("reject", {
        tick: world.tick,
        victimId: snake.deviceId,
        otherId: killer?.deviceId,
        reason: "victim_invincible",
        detail: { remainingMs: snake.invincibleUntil - now },
      });
    }
  }

  if (foodIdx >= 0) {
    const food = world.food[foodIdx]!;
    const foodBeforeCollect = world.food.length;
    const foodTier = food.tier ?? "small";
    world.food.splice(foodIdx, 1);
    noteLoot001Collect({
      tick: world.tick,
      eaterId: snake.deviceId,
      eaterBot: isBotEntity(snake),
      foodTier,
      foodValue: food.value,
      foodBefore: foodBeforeCollect,
      foodAfter: world.food.length,
    });
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
  // FIX-LOOT-001: drop count = body length (CPO RC-LOOT-001). Always place death loot —
  // ambient soft-cap must not swallow corpse gems. FIX-PERF-001: ambient ≤ foodCount.
  const gemCount = Math.max(1, snake.segments.length);
  const cfg = FOOD_TIERS.death;
  const segs = snake.segments;

  for (let i = 0; i < gemCount; i++) {
    cullAmbientFood(world, world.config.foodCount);
    const t = gemCount === 1 ? 0 : i / (gemCount - 1);
    const f = t * (segs.length - 1);
    const i0 = Math.floor(f);
    const i1 = Math.min(segs.length - 1, i0 + 1);
    const u = f - i0;
    const a = segs[i0]!;
    const b = segs[i1]!;
    const x = a.x + (b.x - a.x) * u;
    const y = a.y + (b.y - a.y) * u;
    world.food.push({
      id: nextFoodId(),
      x,
      y,
      kind: cfg.kind,
      value: cfg.score,
      tier: "death",
    });
  }
}

function dropBoostTailFood(world: SnakeIoWorld, snake: SnakeEntity): void {
  const tail = snake.segments[snake.segments.length - 1];
  if (!tail) return;
  // FIX-PERF-001: boost trail must not unbounded-grow ambient food
  cullAmbientFood(world, Math.max(0, world.config.foodCount - 1));
  const cfg = FOOD_TIERS.small;
  world.food.push({
    id: nextFoodId(),
    x: tail.x,
    y: tail.y,
    kind: cfg.kind,
    value: cfg.score,
    tier: "small",
  });
}

function killSnake(
  snake: SnakeEntity,
  config: ComputedBalance,
  world: SnakeIoWorld,
  killer?: SnakeEntity
): void {
  const victimBot = isBotEntity(snake);
  const foodBefore = world.food.length;
  const deathFoodBefore = world.food.filter((f) => f.tier === "death").length;
  const lengthAtDeath = Math.max(snake.segments.length, getSegmentCount(snake));
  const gemsEaten = snake.gemsEaten ?? 0;
  // CPO RC-LOOT-001: length-based expected drop (engine may still use gemsEaten max internally)
  const expectedDrop = Math.max(1, lengthAtDeath);
  deathTrace("kill_snake_enter", {
    tick: world.tick,
    victimId: snake.deviceId,
    victimBot,
    killerId: killer?.deviceId,
    killerBot: killer ? isBotEntity(killer) : undefined,
  });

  const head = snake.segments[0];
  if (head && config.antiCampEnabled) {
    world.deathZones = [...world.deathZones.filter((d) => Date.now() - d.at < 30_000), { x: head.x, y: head.y, at: Date.now() }].slice(-40);
  }
  dropFoodFromSnake(world, snake);
  const deathFoodAfterDrop = world.food.filter((f) => f.tier === "death");
  noteLoot001Drop({
    tick: world.tick,
    victimId: snake.deviceId,
    victimBot,
    lengthAtDeath,
    gemsEaten,
    expectedDrop,
    foodBefore,
    foodAfter: world.food.length,
    deathFoodBefore,
    deathFoodAfter: deathFoodAfterDrop.length,
    samplePositions: deathFoodAfterDrop.slice(-Math.min(8, expectedDrop)).map((f) => ({ x: f.x, y: f.y })),
  });
  // FIX-CORPSE-001: convert body → food, then clear corpse so it cannot linger in world/render
  snake.segments = [];
  snake.segmentCount = 0;
  snake.path = [];
  snake.headX = undefined;
  snake.headY = undefined;
  if (killer && killer.deviceId !== snake.deviceId) {
    world.killFeed = [
      {
        killerId: killer.deviceId,
        killerName: killer.nickname,
        victimId: snake.deviceId,
        victimName: snake.nickname,
        tick: world.tick,
        at: Date.now(),
      },
      ...world.killFeed,
    ].slice(0, 12);
    deathTrace("death_event_publish", {
      tick: world.tick,
      victimId: snake.deviceId,
      victimBot,
      killerId: killer.deviceId,
      killerBot: isBotEntity(killer),
      detail: { killFeedLen: world.killFeed.length },
    });
  }
  snake.alive = false;
  snake.spectating = true;
  deathTrace("alive_false", {
    tick: world.tick,
    victimId: snake.deviceId,
    victimBot,
    killerId: killer?.deviceId,
    killerBot: killer ? isBotEntity(killer) : undefined,
  });
  // FIX-LB-002: drop from leaderboard immediately (do not wait for tick end / respawn)
  updateRankings(world);

  const humanAuto = world.living?.matchRule.humanAutoRespawn ?? false;
  if (isBotEntity(snake) || humanAuto) {
    snake.respawnAt = Date.now() + config.respawnMs;
    deathTrace("respawn_scheduler", {
      tick: world.tick,
      victimId: snake.deviceId,
      victimBot,
      detail: { respawnAt: snake.respawnAt, humanAuto, respawnMs: config.respawnMs },
    });
  } else {
    snake.respawnAt = undefined;
    deathTrace("respawn_scheduler", {
      tick: world.tick,
      victimId: snake.deviceId,
      victimBot,
      detail: { respawnAt: null, humanAuto, reason: "humanAutoRespawn=false" },
    });
  }

  noteDeath006Timer({
    tick: world.tick,
    victimId: snake.deviceId,
    victimBot,
    respawnAt: snake.respawnAt,
    humanAuto,
  });

  // RC-DEATH-005 observe — after all killSnake mutations (no gameplay change)
  noteDeath005({
    tick: world.tick,
    victimId: snake.deviceId,
    victimBot,
    killerId: killer?.deviceId,
    stillInWorld: !!world.snakes[snake.deviceId],
    segmentsAfter: snake.segments.length,
    segmentCountAfter: snake.segmentCount ?? null,
    foodBefore,
    foodAfter: world.food.length,
    deathFoodBefore,
    deathFoodAfter: world.food.filter((f) => f.tier === "death").length,
    killFeedLen: world.killFeed.length,
    killFeedHasVictim: world.killFeed.some((e) => e.victimId === snake.deviceId),
    alive: snake.alive,
    spectating: !!snake.spectating,
  });
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
  deathTrace("respawn_execute", {
    tick: world.tick,
    victimId: snake.deviceId,
    victimBot: isBotEntity(snake),
    detail: { index },
  });
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
  // FIX-SNAKE-UX-001 Step1: respawn length = start length (L10), not hardcoded 3
  finalizeSnake(snake, pos, SNAKE_MVP_RC1.startingSegments, 0);
  deathTrace("alive_true", {
    tick: world.tick,
    victimId: snake.deviceId,
    victimBot: isBotEntity(snake),
    detail: { invincibleUntil: snake.invincibleUntil, spawnShieldMs: world.config.spawnShieldMs },
  });
  deathTrace("spawn_complete", {
    tick: world.tick,
    victimId: snake.deviceId,
    victimBot: isBotEntity(snake),
    detail: { segments: getSegmentCount(snake), pos },
  });
  noteDeath006Respawn({
    tick: world.tick,
    victimId: snake.deviceId,
    victimBot: isBotEntity(snake),
    alive: snake.alive,
    segments: getSegmentCount(snake),
    awaitingInput: snake.awaitingInput,
  });
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
    const created = createSnake(deviceId, nickname, Math.max(0, idx), world);
    created.awaitingInput = true;
    created.invincibleUntil = now + SNAKE_MVP_RC1.spawnSafeMs;
    world.snakes[deviceId] = created;
    updateRankings(world);
    deathTrace("alive_true", {
      tick: world.tick,
      victimId: deviceId,
      victimBot: false,
      detail: { via: "restartPlayerSnake:create" },
    });
    deathTrace("spawn_complete", {
      tick: world.tick,
      victimId: deviceId,
      victimBot: false,
      detail: { via: "restartPlayerSnake:create", segments: getSegmentCount(created) },
    });
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
  snake.bodyRadiusScale = 1;
  snake.respawnAt = undefined;
  snake.invincibleUntil = now + SNAKE_MVP_RC1.spawnSafeMs;
  snake.awaitingInput = true;
  snake.aliveSinceTick = world.tick;
  snake.killStreak = 0;
  snake.foodEaten = 0;
  snake.lastKillerId = undefined;
  snake.nickname = nickname;
  finalizeSnake(snake, pos, SNAKE_MVP_RC1.startingSegments, 0);
  updateRankings(world);
  deathTrace("alive_true", {
    tick: world.tick,
    victimId: deviceId,
    victimBot: false,
    detail: { via: "restartPlayerSnake:reset", invincibleUntil: snake.invincibleUntil },
  });
  deathTrace("spawn_complete", {
    tick: world.tick,
    victimId: deviceId,
    victimBot: false,
    detail: { via: "restartPlayerSnake:reset", segments: getSegmentCount(snake), pos },
  });
}

export function damageSnake(world: SnakeIoWorld, snake: SnakeEntity, amount: number): void {
  if (!snake.alive || snake.spectating) return;
  snake.hp = Math.max(0, (snake.hp ?? 100) - amount);
  if (snake.hp <= 0) killSnake(snake, world.config, world);
}

export function tickWorld(world: SnakeIoWorld, now = Date.now()): SnakeIoWorld {
  world.tick += 1;

  // FIX-PERF-001: enforce ambient soft-cap every tick (boost/storm/refill cannot runaway)
  if (world.tick % 8 === 0) {
    cullAmbientFood(world);
  }

  // 정기 보석 리스폰 — 맵 곳곳에 조금씩 보충 (ambient only vs foodCount)
  let ambientCount = 0;
  for (const f of world.food) {
    if (f.tier !== "death") ambientCount += 1;
  }
  if (world.tick % 40 === 0) {
    const deficit = world.config.foodCount - ambientCount;
    if (deficit > 0) {
      spawnFoodItems(world, Math.min(12, Math.max(2, Math.ceil(deficit * 0.12))));
    }
  } else if (ambientCount < world.config.foodCount * 0.6) {
    spawnFoodItems(world, Math.min(15, Math.ceil((world.config.foodCount - ambientCount) * 0.2)));
  }

  // Drop expired kill-feed entries (2s UI window)
  if (world.killFeed.length > 0) {
    world.killFeed = world.killFeed.filter((e) => !e.at || now - e.at < 2200);
  }

  for (const [i, snake] of Object.entries(world.snakes)) {
    const idx = Object.keys(world.snakes).indexOf(i);
    if (!snake.alive) {
      const rule = world.living?.matchRule;
      const botCan = isBotEntity(snake) && (rule?.respawnEnabled ?? true);
      const humanCan = !isBotEntity(snake) && (rule?.humanAutoRespawn ?? false);
      if ((botCan || humanCan) && snake.respawnAt && now >= snake.respawnAt) {
        respawnSnake(world, snake, idx, now);
        if (humanCan) snake.awaitingInput = false;
      }
      continue;
    }

    if (snake.awaitingInput) {
      if (!isBotEntity(snake) && world.tick % 16 === 0) {
        death003("tick_skip", {
          tick: world.tick,
          victimId: snake.deviceId,
          reason: "awaitingInput",
          detail: { alive: snake.alive },
        });
      }
      continue;
    }

    applyFoodMagnet(world, snake);
    const boostActive = snake.boosting && getSegmentCount(snake) > SNAKE_FEEL.boostMinSegments;
    const stageSpeed = world.living?.stageSpeedMult ?? 1;
    const speed =
      SNAKE_FEEL.baseSpeed * stageSpeed * (boostActive ? SNAKE_FEEL.boostSpeedMult : 1);
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
  // FIX-LB-001: rank by Length. FIX-LB-002: alive only (ghost removed immediately on death).
  world.rankings = Object.values(world.snakes)
    .filter((s) => s.alive && !s.spectating)
    .map((s) => ({ deviceId: s.deviceId, nickname: s.nickname, score: s.score }))
    .sort((a, b) => {
      const la = getSegmentCount(world.snakes[a.deviceId]!);
      const lb = getSegmentCount(world.snakes[b.deviceId]!);
      if (lb !== la) return lb - la;
      return a.deviceId.localeCompare(b.deviceId);
    });
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
    cullAmbientFood(world, Math.max(0, world.config.foodCount - 1));
    const x = event.x + Math.floor(Math.random() * event.radius * 2) - event.radius;
    const y = event.y + Math.floor(Math.random() * event.radius * 2) - event.radius;
    if (!occupied(world, { x, y }) && !isBlocked(world, { x, y })) {
      world.food.push({ id: nextFoodId(), x, y, kind, value });
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
