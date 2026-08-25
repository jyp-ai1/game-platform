/** Living World — safe zone drift, golden snake, food storm, collapse (P0-2) */
import type { FoodKind } from "@game-platform/shared";

import { loadWorldTuning, type SnakeWorldTuning } from "./snake-balance-tuner";
import { SNAKE_POLISH } from "./snake-feel-tuning";
import { cullAmbientFood, damageSnake, spawnWorldBoss, type Direction, type SnakeIoWorld, type Vec } from "./snake-io-engine";
import type { MatchRuleConfig } from "./snake-match-rules";

export interface WorldAnnouncement {
  id: string;
  message: string;
  tick: number;
  expiresAt: number;
  kind: "info" | "golden" | "boss" | "storm" | "collapse" | "safe";
}

export interface GoldenSnakeNpc {
  x: number;
  y: number;
  direction: Direction;
  alive: boolean;
  reward: number;
}

export interface LivingWorldState {
  safeZone: { x: number; y: number; radius: number };
  lastSafeMoveTick: number;
  foodStormUntil: number;
  collapseRadius: number | null;
  goldenSnake?: GoldenSnakeNpc;
  announcements: WorldAnnouncement[];
  matchRule: MatchRuleConfig;
  tuning: SnakeWorldTuning;
  /** Stage mode — movement speed multiplier (default 1). */
  stageSpeedMult?: number;
}

const DELTAS: Record<Direction, Vec> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

let announceId = 0;

function announce(world: SnakeIoWorld, message: string, kind: WorldAnnouncement["kind"], durationMs = 6000): void {
  if (!world.living) return;
  const now = Date.now();
  world.living.announcements = [
    { id: `ann-${++announceId}`, message, tick: world.tick, expiresAt: now + durationMs, kind },
    ...world.living.announcements,
  ].slice(0, 8);
}

export function initLivingWorld(world: SnakeIoWorld, matchRule: MatchRuleConfig): void {
  const mid = Math.floor(world.config.worldSize / 2);
  const tuning = loadWorldTuning();
  const szRadius = Math.max(
    8,
    world.config.safeZoneRadius * (matchRule.safeZoneRadiusMult || 1) * SNAKE_POLISH.safeZoneRadiusMult * tuning.safeZoneRadiusMult
  );
  world.living = {
    safeZone: { x: mid, y: mid, radius: szRadius },
    lastSafeMoveTick: world.tick,
    foodStormUntil: 0,
    collapseRadius: matchRule.collapseEnabled ? Math.floor(world.config.worldSize * 0.45) : null,
    announcements: [],
    matchRule,
    tuning,
  };
}

export function isInSafeZone(world: SnakeIoWorld, pos: Vec): boolean {
  const sz = world.living?.safeZone;
  if (!sz) return true;
  return Math.hypot(pos.x - sz.x, pos.y - sz.y) <= sz.radius;
}

export function isOutsideCollapse(world: SnakeIoWorld, pos: Vec): boolean {
  const r = world.living?.collapseRadius;
  if (r == null) return false;
  const mid = world.config.worldSize / 2;
  return Math.hypot(pos.x - mid, pos.y - mid) > r;
}

function moveSafeZone(world: SnakeIoWorld): void {
  const lw = world.living;
  if (!lw || !lw.matchRule.safeZoneDrift) return;
  const w = world.config.worldSize;
  const margin = lw.safeZone.radius + 4;
  lw.safeZone = {
    x: margin + Math.floor(Math.random() * (w - margin * 2)),
    y: margin + Math.floor(Math.random() * (w - margin * 2)),
    radius: lw.safeZone.radius,
  };
  lw.lastSafeMoveTick = world.tick;
  announce(world, "🛡️ Safe Zone이 이동했습니다!", "safe");
}

function spawnGoldenSnake(world: SnakeIoWorld): void {
  const lw = world.living;
  if (!lw || lw.goldenSnake?.alive) return;
  const mid = Math.floor(world.config.worldSize / 2);
  lw.goldenSnake = { x: mid, y: mid, direction: "right", alive: true, reward: lw.tuning.goldenSnakeBaseReward };
  announce(world, "🐍 Golden Snake가 등장했습니다!", "golden", 8000);
}

function tickGoldenSnake(world: SnakeIoWorld): void {
  const gs = world.living?.goldenSnake;
  if (!gs?.alive) return;
  if (world.tick % 3 !== 0) return;

  const dirs: Direction[] = ["up", "down", "left", "right"];
  if (Math.random() < 0.3) gs.direction = dirs[Math.floor(Math.random() * dirs.length)]!;
  const d = DELTAS[gs.direction];
  const nx = gs.x + d.x;
  const ny = gs.y + d.y;
  const w = world.config.worldSize;
  if (nx >= 1 && nx < w - 1 && ny >= 1 && ny < w - 1) {
    gs.x = nx;
    gs.y = ny;
  }

  for (let i = world.food.length - 1; i >= 0; i--) {
    const f = world.food[i]!;
    if (f.kind === "golden_apple" && Math.hypot(f.x - gs.x, f.y - gs.y) <= 1) {
      world.food.splice(i, 1);
      gs.reward += 20;
    }
  }
}

export function tryCatchGoldenSnake(world: SnakeIoWorld, deviceId: string): boolean {
  const gs = world.living?.goldenSnake;
  const snake = world.snakes[deviceId];
  if (!gs?.alive || !snake?.alive || !snake.segments[0]) return false;
  const head = snake.segments[0];
  if (Math.hypot(head.x - gs.x, head.y - gs.y) > 1.5) return false;
  gs.alive = false;
  snake.score += gs.reward;
  announce(world, `✨ ${snake.nickname}이 Golden Snake를 잡았습니다! +${gs.reward}`, "golden");
  return true;
}

export function startFoodStorm(world: SnakeIoWorld, durationMs?: number): void {
  if (!world.living) return;
  const ms = durationMs ?? world.living.tuning.foodStormDurationMs;
  world.living.foodStormUntil = Date.now() + ms;
  announce(world, `🌧️ Food Storm! ${Math.round(ms / 1000)}초간 먹이 폭풍!`, "storm", 5000);
}

export function tickLivingWorld(world: SnakeIoWorld, playerCount: number, now = Date.now()): void {
  const lw = world.living;
  if (!lw) return;

  lw.announcements = lw.announcements.filter((a) => a.expiresAt > now);

  const t = lw.tuning;

  if (lw.matchRule.safeZoneDrift && world.tick - lw.lastSafeMoveTick >= t.safeZoneMoveTicks) {
    moveSafeZone(world);
  }

  if (lw.matchRule.collapseEnabled && lw.collapseRadius != null && world.tick % t.collapseShrinkEveryTicks === 0) {
    lw.collapseRadius = Math.max(12, lw.collapseRadius - 1);
    if (world.tick % (t.collapseShrinkEveryTicks * 4) === 0) announce(world, "⚠️ 맵이 좁아지고 있습니다!", "collapse");
  }

  if (lw.foodStormUntil > now && world.tick % 8 === 0) {
    // FIX-PERF-001: storm fills toward foodCount only (was 2.5× overrun → ~5k DOM foods)
    let ambient = 0;
    for (const f of world.food) {
      if (f.tier !== "death") ambient += 1;
    }
    const room = Math.max(0, world.config.foodCount - ambient);
    const extra = Math.min(
      room,
      Math.ceil(world.config.foodCount * 0.08 * t.foodStormMultiplier)
    );
    for (let i = 0; i < extra; i++) {
      const w = world.config.worldSize;
      world.food.push({
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * w),
        kind: "normal" as FoodKind,
        value: 12,
        tier: "small",
      });
    }
    // FIX-LOOT-001 + FIX-PERF-001: keep death loot; ambient ≤ foodCount
    cullAmbientFood(world);
  }

  if (playerCount >= 8 && lw.matchRule.bossEnabled && world.tick === t.bossSpawnTick && !world.bossSpawned) {
    spawnWorldBoss(world);
    announce(world, "🐉 Boss Worm 등장! 모두 협력하세요!", "boss", 8000);
  }

  if (world.tick > 0 && world.tick % t.goldenSnakeIntervalTicks === 0 && playerCount >= 4) {
    spawnGoldenSnake(world);
  }

  if (world.tick > 0 && world.tick % (t.goldenSnakeIntervalTicks + 600) === 0 && playerCount >= 4) {
    startFoodStorm(world);
  }

  tickGoldenSnake(world);

  for (const snake of Object.values(world.snakes)) {
    if (!snake.alive || !snake.segments[0]) continue;
    const head = snake.segments[0];
    if (isOutsideCollapse(world, head) && world.tick % 5 === 0) {
      damageSnake(world, snake, t.collapseHpDamage);
    }
    if (lw.matchRule.safeZoneDrift && !isInSafeZone(world, head) && world.tick % 10 === 0) {
      damageSnake(world, snake, t.safeZoneHpDamage);
    }
    tryCatchGoldenSnake(world, snake.deviceId);
  }
}

export function getActiveAnnouncements(world: SnakeIoWorld): WorldAnnouncement[] {
  const now = Date.now();
  return world.living?.announcements.filter((a) => a.expiresAt > now) ?? [];
}
