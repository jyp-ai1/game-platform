/**
 * Agar MVP engine — mass / eat / split / eject / bots / TOP10.
 * Host-authoritative world shape (ready for Room sync in a follow-up).
 */

export const AGAR_WORLD = 900;
export const AGAR_FOOD_TARGET = 220;
export const AGAR_BOT_COUNT = 18;
/** Tuned minimum so first eats / presence feel quick (not Snake L10). */
export const AGAR_START_MASS = 18;
/** Reachable after a short feed streak from start mass. */
export const AGAR_MIN_SPLIT_MASS = 32;
/** Minimum cell mass required to eject (classic W feed). */
export const AGAR_MIN_EJECT_MASS = 32;
/** Mass removed from the cell when ejecting. */
export const AGAR_EJECT_COST = 14;
/** Food pellet mass spawned by eject (slightly less than cost). */
export const AGAR_EJECT_FOOD = 12;
export const AGAR_TICK_MS = 33;
/** Split-attack boost window (ms) — forward eject for absorb. */
export const AGAR_SPLIT_BOOST_MS = 640;
/** Board / grid tone — shared visual target for Snake WORLD map. */
export const AGAR_BOARD_BG = "#0b1220";
export const AGAR_GRID_LINE = "rgba(255,255,255,0.04)";

const COLORS = [
  "#22d3ee", "#a78bfa", "#f472b6", "#fbbf24", "#34d399",
  "#60a5fa", "#fb7185", "#c084fc", "#4ade80", "#f97316",
];

export type Vec = { x: number; y: number };

export type AgarFood = { id: string; x: number; y: number; mass: number; color: string };

export type AgarCell = {
  x: number;
  y: number;
  mass: number;
  /** Split impulse expiry (ms) */
  boostUntil?: number;
  /** Unit direction of split launch (Space = Split Attack). */
  boostDirX?: number;
  boostDirY?: number;
  mergeAt?: number;
};

export type AgarPlayer = {
  id: string;
  nickname: string;
  color: string;
  alive: boolean;
  isBot: boolean;
  cells: AgarCell[];
  /** Desired move target in world coords */
  aimX: number;
  aimY: number;
  score: number;
};

export type AgarWorld = {
  tick: number;
  size: number;
  food: AgarFood[];
  players: Record<string, AgarPlayer>;
  rankings: Array<{ id: string; nickname: string; mass: number; color: string }>;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function massToRadius(mass: number): number {
  return Math.sqrt(Math.max(1, mass)) * 2.2;
}

export function totalMass(p: AgarPlayer): number {
  return p.cells.reduce((s, c) => s + c.mass, 0);
}

function randPos(size: number): Vec {
  const m = 40;
  return { x: m + Math.random() * (size - m * 2), y: m + Math.random() * (size - m * 2) };
}

function foodColor(): string {
  const palette = ["#fde68a", "#86efac", "#fda4af", "#a5b4fc", "#67e8f9"];
  return palette[Math.floor(Math.random() * palette.length)]!;
}

let foodSeq = 0;
function spawnFood(world: AgarWorld, n: number): void {
  for (let i = 0; i < n; i++) {
    const pos = randPos(world.size);
    world.food.push({
      id: `f${foodSeq++}`,
      x: pos.x,
      y: pos.y,
      mass: 1,
      color: foodColor(),
    });
  }
}

function makePlayer(
  id: string,
  nickname: string,
  isBot: boolean,
  size: number,
  colorIdx: number
): AgarPlayer {
  const pos = randPos(size);
  return {
    id,
    nickname,
    color: COLORS[colorIdx % COLORS.length]!,
    alive: true,
    isBot,
    cells: [{ x: pos.x, y: pos.y, mass: AGAR_START_MASS }],
    aimX: pos.x,
    aimY: pos.y,
    score: 0,
  };
}

export function createAgarWorld(localId: string, nickname: string): AgarWorld {
  const world: AgarWorld = {
    tick: 0,
    size: AGAR_WORLD,
    food: [],
    players: {},
    rankings: [],
  };
  world.players[localId] = makePlayer(localId, nickname || "You", false, world.size, 0);
  for (let i = 0; i < AGAR_BOT_COUNT; i++) {
    const id = `bot:${i}`;
    world.players[id] = makePlayer(id, `Cell${i + 1}`, true, world.size, i + 1);
  }
  spawnFood(world, AGAR_FOOD_TARGET);
  updateRankings(world);
  return world;
}

export function setPlayerAim(world: AgarWorld, playerId: string, x: number, y: number): void {
  const p = world.players[playerId];
  if (!p || !p.alive) return;
  p.aimX = clamp(x, 0, world.size);
  p.aimY = clamp(y, 0, world.size);
}

export function splitPlayer(world: AgarWorld, playerId: string, now = Date.now()): void {
  const p = world.players[playerId];
  if (!p || !p.alive) return;
  const next: AgarCell[] = [];
  for (const cell of p.cells) {
    if (cell.mass < AGAR_MIN_SPLIT_MASS || next.length + p.cells.length > 8) {
      next.push(cell);
      continue;
    }
    const half = cell.mass / 2;
    cell.mass = half;
    const ang = Math.atan2(p.aimY - cell.y, p.aimX - cell.x);
    const dirX = Math.cos(ang);
    const dirY = Math.sin(ang);
    const r = massToRadius(half);
    // Launch split cell forward so it can attack/absorb smaller opponents.
    const launch = r * 3.6 + 14;
    next.push(cell);
    next.push({
      x: clamp(cell.x + dirX * launch, 4, world.size - 4),
      y: clamp(cell.y + dirY * launch, 4, world.size - 4),
      mass: half,
      boostUntil: now + AGAR_SPLIT_BOOST_MS,
      boostDirX: dirX,
      boostDirY: dirY,
      mergeAt: now + 8_000,
    });
  }
  p.cells = next.slice(0, 16);
}

/** Classic W — eject mass as a feed pellet toward aim. */
export function ejectMass(world: AgarWorld, playerId: string): void {
  const p = world.players[playerId];
  if (!p || !p.alive) return;
  for (const cell of p.cells) {
    if (cell.mass < AGAR_MIN_EJECT_MASS) continue;
    cell.mass -= AGAR_EJECT_COST;
    const ang = Math.atan2(p.aimY - cell.y, p.aimX - cell.x);
    const r = massToRadius(cell.mass);
    const dist = r + 10;
    world.food.push({
      id: `e${foodSeq++}`,
      x: clamp(cell.x + Math.cos(ang) * dist, 4, world.size - 4),
      y: clamp(cell.y + Math.sin(ang) * dist, 4, world.size - 4),
      mass: AGAR_EJECT_FOOD,
      color: p.color,
    });
  }
}

function speedForMass(mass: number): number {
  return clamp(4.2 - Math.log2(mass + 1) * 0.55, 1.1, 4.2);
}

function moveCell(cell: AgarCell, aimX: number, aimY: number, size: number, now: number): void {
  // Split Attack: ballistic forward while boost is active.
  if (
    cell.boostUntil &&
    now < cell.boostUntil &&
    cell.boostDirX != null &&
    cell.boostDirY != null
  ) {
    const boostSpd = speedForMass(cell.mass) * 3.4;
    cell.x = clamp(cell.x + cell.boostDirX * boostSpd, 4, size - 4);
    cell.y = clamp(cell.y + cell.boostDirY * boostSpd, 4, size - 4);
    return;
  }
  const dx = aimX - cell.x;
  const dy = aimY - cell.y;
  const dist = Math.hypot(dx, dy) || 1;
  const spd = speedForMass(cell.mass);
  const step = Math.min(dist, spd);
  cell.x = clamp(cell.x + (dx / dist) * step, 4, size - 4);
  cell.y = clamp(cell.y + (dy / dist) * step, 4, size - 4);
}

function botAim(world: AgarWorld, bot: AgarPlayer): void {
  const head = bot.cells[0];
  if (!head) return;
  const myMass = totalMass(bot);

  // Avoid larger cells first
  for (const other of Object.values(world.players)) {
    if (other.id === bot.id || !other.alive) continue;
    const o = other.cells[0];
    if (!o) continue;
    if (totalMass(other) > myMass * 1.12) {
      const d = Math.hypot(o.x - head.x, o.y - head.y);
      if (d < 140) {
        bot.aimX = clamp(head.x - (o.x - head.x) * 1.4, 0, world.size);
        bot.aimY = clamp(head.y - (o.y - head.y) * 1.4, 0, world.size);
        return;
      }
    }
  }

  // Chase smaller cells (Normal AI — not overpowered)
  let prey: AgarPlayer | null = null;
  let preyD = 160;
  for (const other of Object.values(world.players)) {
    if (other.id === bot.id || !other.alive) continue;
    const oMass = totalMass(other);
    if (oMass >= myMass * 0.88) continue;
    const o = other.cells[0];
    if (!o) continue;
    const d = Math.hypot(o.x - head.x, o.y - head.y);
    if (d < preyD) {
      preyD = d;
      prey = other;
    }
  }
  if (prey?.cells[0] && preyD < 150) {
    bot.aimX = prey.cells[0].x;
    bot.aimY = prey.cells[0].y;
    return;
  }

  // Prefer nearby food
  let best: AgarFood | null = null;
  let bestD = 180;
  for (const f of world.food) {
    const d = Math.hypot(f.x - head.x, f.y - head.y);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  if (best) {
    bot.aimX = best.x;
    bot.aimY = best.y;
  } else if (world.tick % 40 === 0) {
    const p = randPos(world.size);
    bot.aimX = p.x;
    bot.aimY = p.y;
  }
}

/** Occasional split-attack when chasing a clearly smaller cell (Normal tier). */
function botMaybeSplit(world: AgarWorld, bot: AgarPlayer, now: number): void {
  const head = bot.cells[0];
  if (!head || head.mass < AGAR_MIN_SPLIT_MASS) return;
  if (bot.cells.length >= 4) return;
  if (world.tick % 17 !== (bot.id.charCodeAt(0) % 17)) return;
  const myMass = totalMass(bot);
  for (const other of Object.values(world.players)) {
    if (!other.alive || other.id === bot.id) continue;
    if (totalMass(other) > myMass * 0.7) continue;
    const o = other.cells[0];
    if (!o) continue;
    const d = Math.hypot(o.x - head.x, o.y - head.y);
    if (d > 35 && d < 95 && Math.random() < 0.035) {
      bot.aimX = o.x;
      bot.aimY = o.y;
      splitPlayer(world, bot.id, now);
      return;
    }
  }
}

function tryEatFood(world: AgarWorld, player: AgarPlayer): void {
  for (const cell of player.cells) {
    const r = massToRadius(cell.mass);
    for (let i = world.food.length - 1; i >= 0; i--) {
      const f = world.food[i]!;
      if (Math.hypot(f.x - cell.x, f.y - cell.y) < r * 0.85) {
        cell.mass += f.mass;
        player.score += f.mass;
        world.food.splice(i, 1);
      }
    }
  }
}

/** Agar-local death drop — pellets/gems at death site (not shared loot core). */
function dropDeathMass(
  world: AgarWorld,
  x: number,
  y: number,
  mass: number,
  color: string
): void {
  const n = Math.min(14, Math.max(4, Math.round(mass / 6)));
  const per = Math.max(1, Math.round((mass * 0.4) / n));
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.2;
    const dist = 6 + Math.random() * 22;
    world.food.push({
      id: `d${foodSeq++}`,
      x: clamp(x + Math.cos(ang) * dist, 4, world.size - 4),
      y: clamp(y + Math.sin(ang) * dist, 4, world.size - 4),
      mass: per,
      color: i % 2 === 0 ? color : "#fbbf24",
    });
  }
}

function tryEatPlayers(world: AgarWorld, now: number): void {
  const list = Object.values(world.players).filter((p) => p.alive);
  for (const hunter of list) {
    for (const prey of list) {
      if (hunter.id === prey.id) continue;
      let deathX = prey.aimX;
      let deathY = prey.aimY;
      let dropped = 0;
      for (const hc of hunter.cells) {
        const hr = massToRadius(hc.mass);
        for (let pi = prey.cells.length - 1; pi >= 0; pi--) {
          const pc = prey.cells[pi]!;
          // Slightly larger cell wins — classic Agar eat feel (MVP).
          if (hc.mass < pc.mass * 1.12) continue;
          const pr = massToRadius(pc.mass);
          const d = Math.hypot(hc.x - pc.x, hc.y - pc.y);
          if (d < hr - pr * 0.28) {
            hc.mass += pc.mass * 0.9;
            hunter.score += Math.round(pc.mass);
            deathX = pc.x;
            deathY = pc.y;
            dropped += pc.mass;
            prey.cells.splice(pi, 1);
          }
        }
      }
      if (prey.cells.length === 0) {
        prey.alive = false;
        if (dropped > 0) dropDeathMass(world, deathX, deathY, dropped, prey.color);
        // Respawn bots quickly; humans stay dead until restart (no auto-respawn)
        if (prey.isBot) {
          const pos = randPos(world.size);
          prey.alive = true;
          prey.cells = [{ x: pos.x, y: pos.y, mass: AGAR_START_MASS }];
          prey.aimX = pos.x;
          prey.aimY = pos.y;
        }
      }
    }
  }
  void now;
}

function mergeOwnCells(player: AgarPlayer, now: number): void {
  if (player.cells.length < 2) return;
  const kept: AgarCell[] = [];
  for (const cell of player.cells) {
    let merged = false;
    if (cell.mergeAt && now >= cell.mergeAt) {
      for (const k of kept) {
        if (Math.hypot(k.x - cell.x, k.y - cell.y) < massToRadius(k.mass) + massToRadius(cell.mass)) {
          k.mass += cell.mass;
          merged = true;
          break;
        }
      }
    }
    if (!merged) kept.push(cell);
  }
  player.cells = kept;
}

export function updateRankings(world: AgarWorld): void {
  world.rankings = Object.values(world.players)
    .filter((p) => p.alive)
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      mass: Math.round(totalMass(p)),
      color: p.color,
    }))
    .sort((a, b) => b.mass - a.mass)
    .slice(0, 10);
}

export function tickAgarWorld(world: AgarWorld, now = Date.now()): AgarWorld {
  world.tick += 1;

  for (const p of Object.values(world.players)) {
    if (!p.alive) continue;
    if (p.isBot) {
      botAim(world, p);
      botMaybeSplit(world, p, now);
    }
    for (const cell of p.cells) moveCell(cell, p.aimX, p.aimY, world.size, now);
    mergeOwnCells(p, now);
    tryEatFood(world, p);
  }
  tryEatPlayers(world, now);

  if (world.food.length < AGAR_FOOD_TARGET * 0.7) {
    spawnFood(world, Math.min(24, AGAR_FOOD_TARGET - world.food.length));
  }

  updateRankings(world);
  return world;
}

export function respawnPlayer(world: AgarWorld, playerId: string, nickname?: string): void {
  const existing = world.players[playerId];
  const pos = randPos(world.size);
  world.players[playerId] = {
    id: playerId,
    nickname: nickname || existing?.nickname || "You",
    color: existing?.color || COLORS[0]!,
    alive: true,
    isBot: false,
    cells: [{ x: pos.x, y: pos.y, mass: AGAR_START_MASS }],
    aimX: pos.x,
    aimY: pos.y,
    score: existing?.score ?? 0,
  };
  updateRankings(world);
}

export function cameraFocus(player: AgarPlayer | undefined): Vec {
  if (!player || player.cells.length === 0) return { x: AGAR_WORLD / 2, y: AGAR_WORLD / 2 };
  const m = totalMass(player) || 1;
  let x = 0;
  let y = 0;
  for (const c of player.cells) {
    x += c.x * c.mass;
    y += c.y * c.mass;
  }
  return { x: x / m, y: y / m };
}
