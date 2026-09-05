/**
 * Snake Global WORLD — compact delta/snapshot sync (Egress P0).
 * Host sends small deltas every broadcast tick + full snapshot periodically / on join.
 */
import type { BossEncounter } from "@game-platform/replay-engine/balance";
import type { ComputedBalance, MatchObjective, ReplayMoment, WorldEvent, WorldFeature } from "@game-platform/shared";

import {
  cullAmbientFood,
  type FoodItem,
  type KillFeedEntry,
  type SnakeEntity,
  type SnakeIoWorld,
} from "./snake-io-engine";
import { ensureSnakePath, getSegmentCount, syncSegmentsFromPath } from "./snake-path-movement";
import type { LivingWorldState } from "./snake-living-world";

export const SNAKE_SYNC_V = 1 as const;
/** Full snapshot every N world ticks (host broadcast path). */
export const SNAKE_SNAPSHOT_TICK_INTERVAL = 120;

export type SnakeCompactSnake = {
  id: string;
  nickname: string;
  headX: number;
  headY: number;
  angle: number;
  alive: boolean;
  score: number;
  segmentCount: number;
  spectating?: boolean;
  isBot?: boolean;
  color?: string;
};

export type SnakeSyncSnapshot = {
  v: typeof SNAKE_SYNC_V;
  tick: number;
  config: ComputedBalance;
  objective: MatchObjective;
  features: WorldFeature[];
  snakes: SnakeCompactSnake[];
  food: FoodItem[];
  killFeed: KillFeedEntry[];
  events: WorldEvent[];
  rankings: SnakeIoWorld["rankings"];
  moments: ReplayMoment[];
  living?: LivingWorldState;
  boss?: BossEncounter;
  bossSpawned?: boolean;
  expMultiplier?: number;
};

export type SnakeSyncDelta = {
  v: typeof SNAKE_SYNC_V;
  tick: number;
  /** Position-only updates: [id, headX, headY, angle] */
  moves?: Array<[string, number, number, number]>;
  snakes?: SnakeCompactSnake[];
  foodAdd?: FoodItem[];
  foodRemove?: number[];
  killFeed?: KillFeedEntry[];
  events?: WorldEvent[];
  rankings?: SnakeIoWorld["rankings"];
  moments?: ReplayMoment[];
  living?: LivingWorldState;
  boss?: BossEncounter | null;
  bossSpawned?: boolean;
  expMultiplier?: number;
};

export type SnakeSyncFoodIndex = Map<number, FoodItem>;

function foodKey(f: FoodItem): number {
  return f.id ?? 0;
}

export function compactSnake(snake: SnakeEntity): SnakeCompactSnake {
  ensureSnakePath(snake);
  return {
    id: snake.deviceId,
    nickname: snake.nickname,
    headX: snake.headX ?? snake.segments[0]?.x ?? 0,
    headY: snake.headY ?? snake.segments[0]?.y ?? 0,
    angle: snake.angle ?? 0,
    alive: snake.alive,
    score: snake.score,
    segmentCount: getSegmentCount(snake),
    spectating: snake.spectating,
    isBot: snake.isBot,
    color: snake.color,
  };
}

function buildTrailFromCompact(c: SnakeCompactSnake): { x: number; y: number }[] {
  const len = Math.max(1, c.segmentCount);
  const dx = Math.cos(c.angle) * 0.85;
  const dy = Math.sin(c.angle) * 0.85;
  const segs: { x: number; y: number }[] = [{ x: c.headX, y: c.headY }];
  for (let i = 1; i < len; i++) {
    segs.push({ x: c.headX - dx * i, y: c.headY - dy * i });
  }
  return segs;
}

export function applyCompactSnakeToWorld(world: SnakeIoWorld, c: SnakeCompactSnake, localId: string): void {
  if (c.id === localId) return;
  let snake = world.snakes[c.id];
  if (!snake) {
    snake = {
      deviceId: c.id,
      nickname: c.nickname,
      segments: buildTrailFromCompact(c),
      direction: "right",
      pendingDirection: "right",
      score: c.score,
      alive: c.alive,
      color: c.color ?? "#94a3b8",
      isBot: c.isBot,
      headX: c.headX,
      headY: c.headY,
      angle: c.angle,
      segmentCount: c.segmentCount,
      spectating: c.spectating,
    };
    world.snakes[c.id] = snake;
    syncSegmentsFromPath(snake);
    return;
  }
  snake.nickname = c.nickname;
  snake.alive = c.alive;
  snake.score = c.score;
  snake.spectating = c.spectating;
  snake.isBot = c.isBot;
  snake.headX = c.headX;
  snake.headY = c.headY;
  snake.angle = c.angle;
  snake.segmentCount = c.segmentCount;
  snake.segments = buildTrailFromCompact(c);
  syncSegmentsFromPath(snake);
}

export function buildSnakeWorldSnapshot(world: SnakeIoWorld): SnakeSyncSnapshot {
  cullAmbientFood(world);
  return {
    v: SNAKE_SYNC_V,
    tick: world.tick,
    config: world.config,
    objective: world.objective,
    features: world.features,
    snakes: Object.values(world.snakes).map(compactSnake),
    food: world.food.map((f) => ({ ...f })),
    killFeed: world.killFeed.map((k) => ({ ...k })),
    events: world.events.map((e) => ({ ...e })),
    rankings: world.rankings.slice(),
    moments: world.moments.slice(0, 5),
    living: world.living ? { ...world.living, announcements: [...world.living.announcements] } : undefined,
    boss: world.boss ? { ...world.boss } : undefined,
    bossSpawned: world.bossSpawned,
    expMultiplier: world.expMultiplier,
  };
}

export function indexFood(world: SnakeIoWorld): SnakeSyncFoodIndex {
  const m = new Map<number, FoodItem>();
  for (const f of world.food) {
    const id = foodKey(f);
    if (id) m.set(id, f);
  }
  return m;
}

export function buildSnakeWorldDelta(
  prev: {
    tick: number;
    snakes: Map<string, SnakeCompactSnake>;
    food: SnakeSyncFoodIndex;
    killLen: number;
    eventLen: number;
    rankingsSig: string;
    livingSig: string;
  },
  world: SnakeIoWorld
): SnakeSyncDelta | null {
  cullAmbientFood(world);
  const delta: SnakeSyncDelta = { v: SNAKE_SYNC_V, tick: world.tick };
  let changed = false;

  const moves: Array<[string, number, number, number]> = [];
  const snakeUpdates: SnakeCompactSnake[] = [];
  for (const snake of Object.values(world.snakes)) {
    const c = compactSnake(snake);
    const p = prev.snakes.get(c.id);
    const moved =
      !p || p.headX !== c.headX || p.headY !== c.headY || p.angle !== c.angle;
    const statsChanged =
      !p ||
      p.alive !== c.alive ||
      p.score !== c.score ||
      p.segmentCount !== c.segmentCount ||
      p.spectating !== c.spectating;

    if (statsChanged) {
      snakeUpdates.push(c);
      changed = true;
    } else if (moved) {
      moves.push([c.id, c.headX, c.headY, c.angle]);
      changed = true;
    }
    if (moved || statsChanged) prev.snakes.set(c.id, c);
  }
  if (moves.length) delta.moves = moves;
  if (snakeUpdates.length) delta.snakes = snakeUpdates;

  const curFood = indexFood(world);
  const foodAdd: FoodItem[] = [];
  const foodRemove: number[] = [];
  for (const [id, f] of curFood) {
    if (!prev.food.has(id)) foodAdd.push({ ...f });
  }
  for (const id of prev.food.keys()) {
    if (!curFood.has(id)) foodRemove.push(id);
  }
  if (foodAdd.length) {
    delta.foodAdd = foodAdd;
    changed = true;
  }
  if (foodRemove.length) {
    delta.foodRemove = foodRemove;
    changed = true;
  }
  prev.food = curFood;

  if (world.killFeed.length > prev.killLen) {
    delta.killFeed = world.killFeed.slice(0, world.killFeed.length - prev.killLen);
    prev.killLen = world.killFeed.length;
    changed = true;
  }

  if (world.events.length > prev.eventLen) {
    delta.events = world.events.slice(0, world.events.length - prev.eventLen);
    prev.eventLen = world.events.length;
    changed = true;
  }

  const rankingsSig = JSON.stringify(world.rankings);
  if (rankingsSig !== prev.rankingsSig) {
    delta.rankings = world.rankings.slice();
    prev.rankingsSig = rankingsSig;
    changed = true;
  }

  const livingSig = world.living ? JSON.stringify(world.living) : "";
  if (livingSig && livingSig !== prev.livingSig) {
    delta.living = world.living;
    prev.livingSig = livingSig;
    changed = true;
  }

  if (world.moments.length) {
    delta.moments = world.moments.slice(0, 5);
    changed = true;
  }
  if (world.boss !== undefined) {
    delta.boss = world.boss ?? null;
    changed = true;
  }
  if (world.bossSpawned !== undefined) {
    delta.bossSpawned = world.bossSpawned;
    changed = true;
  }
  if (world.expMultiplier !== undefined) {
    delta.expMultiplier = world.expMultiplier;
    changed = true;
  }

  prev.tick = world.tick;
  return changed ? delta : null;
}

export function createSnakeSyncTracker(world: SnakeIoWorld): {
  tick: number;
  snakes: Map<string, SnakeCompactSnake>;
  food: SnakeSyncFoodIndex;
  killLen: number;
  eventLen: number;
  rankingsSig: string;
  livingSig: string;
} {
  return {
    tick: world.tick,
    snakes: new Map(Object.values(world.snakes).map((s) => [s.deviceId, compactSnake(s)])),
    food: indexFood(world),
    killLen: world.killFeed.length,
    eventLen: world.events.length,
    rankingsSig: JSON.stringify(world.rankings),
    livingSig: world.living ? JSON.stringify(world.living) : "",
  };
}

export function applySnakeWorldSnapshot(base: SnakeIoWorld, snap: SnakeSyncSnapshot, localId: string): SnakeIoWorld {
  const next: SnakeIoWorld = {
    ...base,
    tick: snap.tick,
    config: snap.config,
    objective: snap.objective,
    features: snap.features,
    snakes: { ...base.snakes },
    food: snap.food.map((f) => ({ ...f })),
    killFeed: snap.killFeed.map((k) => ({ ...k })),
    events: snap.events.map((e) => ({ ...e })),
    rankings: snap.rankings.slice(),
    moments: snap.moments.slice(),
    living: snap.living,
    boss: snap.boss,
    bossSpawned: snap.bossSpawned,
    expMultiplier: snap.expMultiplier,
  };
  for (const c of snap.snakes) {
    applyCompactSnakeToWorld(next, c, localId);
  }
  cullAmbientFood(next);
  return next;
}

export function applySnakeWorldDelta(base: SnakeIoWorld, delta: SnakeSyncDelta, localId: string): SnakeIoWorld {
  if (delta.tick < base.tick) return base;
  const next: SnakeIoWorld = {
    ...base,
    tick: delta.tick,
    snakes: { ...base.snakes },
    food: [...base.food],
    killFeed: [...base.killFeed],
    events: [...base.events],
    rankings: delta.rankings ? delta.rankings.slice() : base.rankings,
    moments: delta.moments ?? base.moments,
    living: delta.living ?? base.living,
    boss: delta.boss === null ? undefined : delta.boss ?? base.boss,
    bossSpawned: delta.bossSpawned ?? base.bossSpawned,
    expMultiplier: delta.expMultiplier ?? base.expMultiplier,
  };

  if (delta.moves) {
    for (const [id, headX, headY, angle] of delta.moves) {
      if (id === localId) continue;
      const snake = next.snakes[id];
      if (!snake) continue;
      snake.headX = headX;
      snake.headY = headY;
      snake.angle = angle;
      snake.segments = buildTrailFromCompact({
        id,
        nickname: snake.nickname,
        headX,
        headY,
        angle,
        alive: snake.alive,
        score: snake.score,
        segmentCount: snake.segmentCount ?? getSegmentCount(snake),
      });
      syncSegmentsFromPath(snake);
    }
  }
  if (delta.snakes) {
    for (const c of delta.snakes) applyCompactSnakeToWorld(next, c, localId);
  }
  if (delta.foodRemove?.length) {
    const remove = new Set(delta.foodRemove);
    next.food = next.food.filter((f) => !remove.has(foodKey(f)));
  }
  if (delta.foodAdd?.length) {
    next.food.push(...delta.foodAdd.map((f) => ({ ...f })));
  }
  if (delta.killFeed?.length) {
    next.killFeed = [...delta.killFeed, ...next.killFeed].slice(0, 12);
  }
  if (delta.events?.length) {
    next.events = [...delta.events, ...next.events].slice(0, 8);
  }
  cullAmbientFood(next);
  return next;
}

export function snapshotFromLegacyState(state: SnakeIoWorld): SnakeSyncSnapshot {
  return buildSnakeWorldSnapshot(state);
}
