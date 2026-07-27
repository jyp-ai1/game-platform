/** Living Global World AI — role-based brains, natural population, event flocking */
import { pickBotDifficulty, POPULATION_TARGET, type BotDifficulty } from "@game-platform/replay-engine/global-world";

import {
  createSnake,
  createSnakeAt,
  isOpposite,
  restartPlayerSnake,
  retireSnakeNaturally,
  updateRankings,
  type Direction,
  type SnakeEntity,
  type SnakeIoWorld,
  type Vec,
} from "./snake-io-engine";
import { SNAKE_FEEL } from "./snake-feel-tuning";
import { PLAYTEST_AI } from "./snake-playtest-tuning";
import { randomSnakeHeadId } from "./snake-characters";

export { POPULATION_TARGET as SNAKE_WORLD_TARGET };

export type BotRole = "explorer" | "hunter" | "farmer" | "aggressive" | "scavenger";

const BOT_PREFIX = "bot:";
const ROLES: BotRole[] = ["farmer", "hunter", "aggressive", "explorer", "scavenger"];

export const BOT_NICKNAMES: Record<BotRole, string[]> = {
  farmer: ["BOT Farmer", "BOT Harvest", "BOT Grain", "BOT Crop", "BOT Field"],
  hunter: ["BOT Hunter", "BOT Alpha", "BOT Viper", "BOT Cobra", "BOT Fang"],
  aggressive: ["BOT Aggro", "BOT Rush", "BOT Apex", "BOT Titan", "BOT Pyro"],
  explorer: ["BOT Explorer", "BOT Nova", "BOT Drift", "BOT Wander", "BOT Path"],
  scavenger: ["BOT Scav", "BOT Omega", "BOT Pick", "BOT Loot", "BOT Remnant"],
};

export function isBotSnake(snake: SnakeEntity | undefined): boolean {
  return !!snake?.isBot || (snake?.deviceId.startsWith(BOT_PREFIX) ?? false);
}

export function countWorldSnakes(world: SnakeIoWorld): number {
  return Object.keys(world.snakes).length;
}

export function countHumanSnakes(world: SnakeIoWorld): number {
  return Object.values(world.snakes).filter((s) => !isBotSnake(s)).length;
}

export function countBotSnakes(world: SnakeIoWorld): number {
  return Object.values(world.snakes).filter((s) => isBotSnake(s)).length;
}

function botDeviceId(index: number): string {
  return `${BOT_PREFIX}${index}`;
}

function roleForSlot(slot: number): BotRole {
  return ROLES[slot % ROLES.length]!;
}

function nicknameForRole(role: BotRole, slot: number): string {
  const list = BOT_NICKNAMES[role];
  return list[slot % list.length]!;
}

function spawnPointForRole(world: SnakeIoWorld, role: BotRole): Vec {
  const w = world.config.worldSize;
  const mid = Math.floor(w / 2);
  const sz = world.living?.safeZone;
  const r = (pct: number) => Math.floor(w * pct);

  switch (role) {
    case "hunter":
    case "aggressive":
      return { x: mid + Math.floor(Math.random() * 20) - 10, y: mid + Math.floor(Math.random() * 20) - 10 };
    case "farmer":
      return sz
        ? { x: sz.x + Math.floor(Math.random() * sz.radius) - Math.floor(sz.radius / 2), y: sz.y + Math.floor(Math.random() * sz.radius) - Math.floor(sz.radius / 2) }
        : { x: mid + Math.floor(Math.random() * 30) - 15, y: mid + Math.floor(Math.random() * 30) - 15 };
    case "scavenger": {
      const dz = world.deathZones[0];
      if (dz) return { x: dz.x + Math.floor(Math.random() * 6) - 3, y: dz.y + Math.floor(Math.random() * 6) - 3 };
      return { x: mid + Math.floor(Math.random() * 40) - 20, y: mid + Math.floor(Math.random() * 40) - 20 };
    }
    case "explorer":
    default:
      return { x: r(0.15) + Math.floor(Math.random() * r(0.7)), y: r(0.15) + Math.floor(Math.random() * r(0.7)) };
  }
}

function pickBotToRetire(world: SnakeIoWorld): SnakeEntity | null {
  const bots = Object.values(world.snakes).filter((s) => isBotSnake(s));
  if (bots.length === 0) return null;
  return bots.sort((a, b) => (a.aliveSinceTick ?? 0) - (b.aliveSinceTick ?? 0))[0] ?? null;
}

function isBlockedForBot(world: SnakeIoWorld, pos: Vec): boolean {
  if (pos.x < 0 || pos.x >= world.config.worldSize || pos.y < 0 || pos.y >= world.config.worldSize) return true;
  for (const f of world.features) {
    if (f.type === "wall" || f.type === "river") {
      const fw = f.w ?? 1;
      const fh = f.h ?? 1;
      if (pos.x >= f.x && pos.x < f.x + fw && pos.y >= f.y && pos.y < f.y + fh) return true;
    }
  }
  return false;
}

function wouldCollide(world: SnakeIoWorld, snake: SnakeEntity, dir: Direction): boolean {
  const head = snake.segments[0];
  if (!head) return true;
  const deltas: Record<Direction, Vec> = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  };
  const next = { x: head.x + deltas[dir].x, y: head.y + deltas[dir].y };
  if (isBlockedForBot(world, next)) return true;
  if (snake.segments.slice(0, -1).some((s) => s.x === next.x && s.y === next.y)) return true;
  return Object.values(world.snakes).some(
    (other) =>
      other.alive && !other.spectating && other.deviceId !== snake.deviceId &&
      other.segments.some((s) => s.x === next.x && s.y === next.y)
  );
}

function pickDirectionWithJitter(
  world: SnakeIoWorld,
  snake: SnakeEntity,
  target: Vec,
  seed: number
): Direction | null {
  const head = snake.segments[0];
  if (!head) return null;
  const w = world.config.worldSize;
  const options: Direction[] = ["up", "down", "left", "right"];
  const valid = options.filter((d) => !isOpposite(d, snake.direction) && !wouldCollide(world, snake, d));
  if (valid.length === 0) return null;
  valid.sort((a, b) => {
    const da = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[a];
    const db = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[b];
    const na = { x: head.x + da.x, y: head.y + da.y };
    const nb = { x: head.x + db.x, y: head.y + db.y };
    const distA = Math.hypot(target.x - na.x, target.y - na.y);
    const distB = Math.hypot(target.x - nb.x, target.y - nb.y);
    const wallA = Math.min(na.x, na.y, w - 1 - na.x, w - 1 - na.y);
    const wallB = Math.min(nb.x, nb.y, w - 1 - nb.x, w - 1 - nb.y);
    return distA + (wallA < 4 ? 8 : 0) - (distB + (wallB < 4 ? 8 : 0));
  });
  const jitter = ((seed + world.tick) % 100) / 100 < PLAYTEST_AI.directionJitterChance;
  const wander = ((seed + world.tick * 3) % 100) / 100 < 0.08;
  const idx = wander && valid.length > 1 ? Math.floor(Math.random() * valid.length) : jitter && valid.length > 1 ? 1 : 0;
  return valid[idx] ?? valid[0] ?? null;
}

function nearestFood(world: SnakeIoWorld, head: Vec): Vec | null {
  let best: Vec | null = null;
  let bestD = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - head.x, f.y - head.y);
    if (d < bestD) { bestD = d; best = f; }
  }
  return best;
}

function getEventTarget(world: SnakeIoWorld): Vec | null {
  if (world.living?.goldenSnake?.alive) {
    return { x: world.living.goldenSnake.x, y: world.living.goldenSnake.y };
  }
  if (world.boss && !world.boss.defeated) {
    return { x: world.boss.x, y: world.boss.y };
  }
  if (world.living && world.living.foodStormUntil > Date.now()) {
    const mid = Math.floor(world.config.worldSize / 2);
    return { x: mid, y: mid };
  }
  const evt = world.events[0];
  if (evt) return { x: evt.x, y: evt.y };
  return null;
}

function pickPrey(world: SnakeIoWorld, snake: SnakeEntity, opts: { humansOnly?: boolean; botsOk?: boolean }): Vec | null {
  const head = snake.segments[0];
  if (!head) return null;
  let best: Vec | null = null;
  let bestD = Infinity;
  for (const prey of Object.values(world.snakes)) {
    if (!prey.alive || prey.spectating || prey.deviceId === snake.deviceId) continue;
    const bot = isBotSnake(prey);
    if (opts.humansOnly && bot) continue;
    if (!opts.botsOk && bot) continue;
    if (prey.score > snake.score * 1.3) continue;
    const ph = prey.segments[0];
    if (!ph) continue;
    const d = Math.hypot(ph.x - head.x, ph.y - head.y);
    if (d < 18 && d < bestD) { bestD = d; best = ph; }
  }
  return best;
}

function pickFleeTarget(world: SnakeIoWorld, snake: SnakeEntity): Vec | null {
  const head = snake.segments[0];
  if (!head) return null;
  for (const threat of Object.values(world.snakes)) {
    if (!threat.alive || threat.deviceId === snake.deviceId) continue;
    if (threat.score <= snake.score * 1.1) continue;
    const th = threat.segments[0];
    if (!th) continue;
    const d = Math.hypot(th.x - head.x, th.y - head.y);
    if (d < 8) {
      return { x: head.x + (head.x - th.x) * 2, y: head.y + (head.y - th.y) * 2 };
    }
  }
  return null;
}

function top1Head(world: SnakeIoWorld): Vec | null {
  const top = world.rankings[0];
  if (!top) return null;
  const s = world.snakes[top.deviceId];
  return s?.segments[0] ?? null;
}

function resolveTarget(world: SnakeIoWorld, snake: SnakeEntity, role: BotRole): Vec {
  const head = snake.segments[0]!;
  const event = getEventTarget(world);
  if (event) return event;

  const flee = pickFleeTarget(world, snake);
  if (flee && snake.score < 40) return flee;

  switch (role) {
    case "farmer": {
      const food = nearestFood(world, head);
      return food ?? { x: head.x + 3, y: head.y };
    }
    case "hunter": {
      const human = pickPrey(world, snake, { humansOnly: true });
      if (human) return human;
      const top = top1Head(world);
      if (top && world.rankings[0]?.deviceId !== snake.deviceId) return top;
      return nearestFood(world, head) ?? head;
    }
    case "aggressive": {
      const prey = pickPrey(world, snake, { botsOk: true });
      if (prey) return prey;
      const top = top1Head(world);
      return top ?? nearestFood(world, head) ?? head;
    }
    case "scavenger": {
      if (world.deathZones.length > 0) {
        const dz = world.deathZones[Math.floor(Math.random() * world.deathZones.length)]!;
        return { x: dz.x, y: dz.y };
      }
      return nearestFood(world, head) ?? head;
    }
    case "explorer":
    default: {
      const w = world.config.worldSize;
      if (world.tick % 40 < 5) {
        return { x: Math.floor(Math.random() * w), y: Math.floor(Math.random() * w) };
      }
      return nearestFood(world, head) ?? { x: head.x + 5, y: head.y + 3 };
    }
  }
}

function botSeedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function spawnBot(world: SnakeIoWorld, slot: number, humans: number, difficulty: BotDifficulty): SnakeEntity {
  const role = roleForSlot(slot);
  const pos = spawnPointForRole(world, role);
  const segs = world.living?.matchRule.startingSegments ?? 3;
  const id = botDeviceId(slot);
  const seed = botSeedFromId(id);
  const snake = createSnakeAt(
    id,
    nicknameForRole(role, slot),
    humans + slot,
    world,
    pos,
    segs,
    { isBot: true, botRole: role, score: 10 + Math.floor(Math.random() * 120) }
  );
  snake.botDifficulty = difficulty;
  snake.isBot = true;
  snake.botRole = role;
  snake.botPhase = seed % PLAYTEST_AI.thinkInterval;
  snake.botSeed = seed;
  snake.headCharacter = randomSnakeHeadId(seed);
  return snake;
}

/** Sync population — natural bot retirement when humans join (max 20 humans) */
export function syncSnakePopulation(
  world: SnakeIoWorld,
  humans: { deviceId: string; nickname: string }[],
  target = POPULATION_TARGET,
  localDeviceId?: string
): void {
  const capped = capHumansForWorld(humans, localDeviceId, 20);
  const humanIds = new Set(capped.map((h) => h.deviceId));

  for (const id of Object.keys(world.snakes)) {
    const s = world.snakes[id];
    if (!s || isBotSnake(s)) continue;
    if (!humanIds.has(id)) delete world.snakes[id];
  }

  const difficulty = pickBotDifficulty(capped.length);

  for (let i = 0; i < capped.length; i++) {
    const h = capped[i]!;
    if (!world.snakes[h.deviceId]) {
      while (countWorldSnakes(world) >= target) {
        const retire = pickBotToRetire(world);
        if (!retire) break;
        retireSnakeNaturally(world, retire);
      }
      world.snakes[h.deviceId] = createSnake(h.deviceId, h.nickname, i, world);
      world.snakes[h.deviceId]!.isBot = false;
    } else {
      world.snakes[h.deviceId]!.nickname = h.nickname;
      world.snakes[h.deviceId]!.isBot = false;
    }
  }

  let botSlot = 0;
  while (countWorldSnakes(world) < target && botSlot < 80) {
    const id = botDeviceId(botSlot);
    if (!world.snakes[id]) {
      world.snakes[id] = spawnBot(world, botSlot, capped.length, difficulty);
    }
    botSlot += 1;
  }

  while (countWorldSnakes(world) > target) {
    const retire = pickBotToRetire(world);
    if (!retire) break;
    retireSnakeNaturally(world, retire);
  }

  updateRankings(world);
}

/** Always keep local human in capped set — room may have 30+ registered players. */
function capHumansForWorld(
  humans: { deviceId: string; nickname: string }[],
  localDeviceId: string | undefined,
  max: number
): { deviceId: string; nickname: string }[] {
  if (!localDeviceId) return humans.slice(0, max);
  const local = humans.find((h) => h.deviceId === localDeviceId);
  const rest = humans.filter((h) => h.deviceId !== localDeviceId);
  if (local) return [local, ...rest.slice(0, max - 1)];
  return humans.slice(0, max);
}

/** Force-create local human snake when registry gap detected. */
export function createLocalSnake(
  world: SnakeIoWorld,
  deviceId: string,
  nickname: string,
  playerIndex = 0
): SnakeEntity {
  while (countWorldSnakes(world) >= POPULATION_TARGET) {
    const retire = pickBotToRetire(world);
    if (!retire) break;
    retireSnakeNaturally(world, retire);
  }
  const snake = createSnake(deviceId, nickname, playerIndex, world);
  snake.isBot = false;
  world.snakes[deviceId] = snake;
  updateRankings(world);
  return snake;
}

export function ensureLocalSnake(
  world: SnakeIoWorld,
  deviceId: string,
  nickname: string,
  playerIndex = 0
): SnakeEntity {
  const existing = world.snakes[deviceId];
  if (existing && existing.alive && !existing.spectating) return existing;
  if (existing && !existing.alive) {
    restartPlayerSnake(world, deviceId, nickname);
    return world.snakes[deviceId]!;
  }
  const snake = createLocalSnake(world, deviceId, nickname, playerIndex);
  snake.awaitingInput = true;
  return snake;
}

export function tickBotBrains(world: SnakeIoWorld): void {
  const bots = Object.values(world.snakes).filter((s) => isBotSnake(s) && s.alive && !s.spectating);
  const batchSize = Math.max(1, Math.floor(bots.length * PLAYTEST_AI.brainBatchRatio));
  const offset = world.tick % bots.length;

  for (let i = 0; i < batchSize; i++) {
    const snake = bots[(offset + i * 2) % bots.length];
    if (!snake) continue;
    const phase = snake.botPhase ?? 0;
    if ((world.tick + phase) % PLAYTEST_AI.thinkInterval !== 0) continue;
    runBotBrain(world, snake);
  }
}

function runBotBrain(world: SnakeIoWorld, snake: SnakeEntity): void {
  const role = snake.botRole ?? "farmer";
  const diff: BotDifficulty = snake.botDifficulty ?? "easy";
  const seed = snake.botSeed ?? 0;
  const head = snake.segments[0];
  if (!head) return;

  const flee = pickFleeTarget(world, snake);
  const food = nearestFood(world, head);
  const threatNear = flee != null;
  const chasing = role === "aggressive" || role === "hunter";
  const segCount = snake.segmentCount ?? snake.segments.length;

  let state: NonNullable<SnakeEntity["botState"]> = "search";
  if (threatNear && snake.score < 50) state = "escape";
  else if (food && (role === "farmer" || role === "scavenger" || role === "explorer")) state = "chase";
  else if (chasing && pickPrey(world, snake, { humansOnly: role === "hunter", botsOk: role === "aggressive" })) state = "chase";
  else if ((seed + world.tick) % 47 < 6) state = "wander";
  else state = "search";
  snake.botState = state;

  let target: Vec;
  switch (state) {
    case "escape":
      target = flee!;
      break;
    case "wander":
      target = {
        x: head.x + Math.cos((seed + world.tick) * 0.07) * 12,
        y: head.y + Math.sin((seed + world.tick) * 0.09) * 12,
      };
      break;
    case "chase":
      target = resolveTarget(world, snake, role);
      break;
    default:
      target = food ?? { x: head.x + ((seed % 5) - 2) * 8, y: head.y + ((seed % 7) - 3) * 8 };
  }

  const baseMistake =
    diff === "easy" ? 0.08 : diff === "normal" ? 0.05 : diff === "hunter" ? 0.03 : 0.015;
  const mistake = baseMistake + ((seed % 17) / 17) * PLAYTEST_AI.mistakeVariance;
  const dir = pickDirectionWithJitter(world, snake, target, seed);
  if (dir && Math.random() > mistake) {
    snake.pendingDirection = dir;
  } else if (Math.random() < 0.15) {
    const dirs: Direction[] = ["up", "down", "left", "right"];
    const options = dirs.filter(
      (d) => !isOpposite(d, snake.direction) && !wouldCollide(world, snake, d)
    );
    if (options.length > 0) {
      snake.pendingDirection = options[Math.floor(Math.random() * options.length)]!;
    }
  }

  if (segCount > 5 && chasing) {
    if ((world.tick + (snake.botPhase ?? 0)) % PLAYTEST_AI.boostCadence === 0) {
      const boostChance = diff === "legend" ? 0.12 : diff === "hunter" ? 0.08 : 0.04;
      if (Math.random() < boostChance && segCount > 3) snake.boosting = true;
      else if (snake.boosting && Math.random() < 0.3) snake.boosting = false;
    }
  } else if (state === "escape" && segCount > 4 && Math.random() < 0.06) {
    snake.boosting = true;
  }
}

/** Fill missing bot slots after retirements (combat respawns handled by tickWorld) */
export function respawnDeadBots(world: SnakeIoWorld, target = POPULATION_TARGET): void {
  const difficulty = pickBotDifficulty(countHumanSnakes(world));
  let slot = 0;
  while (countWorldSnakes(world) < target && slot < 80) {
    const id = botDeviceId(slot);
    if (!world.snakes[id]) {
      world.snakes[id] = spawnBot(world, slot, countHumanSnakes(world), difficulty);
    }
    slot += 1;
  }
  if (countWorldSnakes(world) !== world.rankings.length) updateRankings(world);
}

export const SnakeAiFillEngine = {
  sync: syncSnakePopulation,
  tick: tickBotBrains,
  respawn: respawnDeadBots,
  isBot: isBotSnake,
  countBots: countBotSnakes,
  countHumans: countHumanSnakes,
  target: POPULATION_TARGET,
};
