/**
 * Agar competitive engine — mass decay · virus pop · split · backward eject · size/speed.
 * AGAR-FUN-003: mass-conserving virus split · moving W pellets · virus feed/spawn.
 * AGAR-FUN-004: ~2× map · gem tiers · early growth · density retune (not blind 2×).
 */

/** Linear world edge — ~2× FUN-003 (900 → 1800); area ~4× so density retuned separately. */
export const AGAR_WORLD = 1800;
/**
 * Gem target — area grew ~4×; keep absolute count ~1.65× (not 4×) so early room exists
 * while local small-gem clusters still feed the first 30–60s.
 */
export const AGAR_FOOD_TARGET = 360;
export const AGAR_BOT_COUNT = 26;
/** Modest start — first gems matter; not already mid-game sized. */
export const AGAR_START_MASS = 28;
/** Split needs enough mass so halves aren't spam crumbs. */
export const AGAR_MIN_SPLIT_MASS = 48;
/** Floor for each half after split — blocks tiny fragment spam. */
export const AGAR_MIN_CELL_AFTER_SPLIT = 22;
/** Soft cap on pieces per player (Space + virus). */
export const AGAR_MAX_CELLS = 8;
/** Short Space cooldown — no infinite split spam. */
export const AGAR_SPLIT_COOLDOWN_MS = 420;
/** Minimum cell mass required to eject (classic W feed). */
export const AGAR_MIN_EJECT_MASS = 36;
/** Mass removed from the cell when ejecting. */
export const AGAR_EJECT_COST = 14;
/** Food pellet mass spawned by eject (slightly less than cost). */
export const AGAR_EJECT_FOOD = 12;
/** Ballistic eject speed (world units / tick) — must be visibly moving. */
export const AGAR_EJECT_SPEED = 8.2;
/** How many ticks an eject pellet keeps gliding. */
export const AGAR_EJECT_GLIDE_TICKS = 32;
export const AGAR_TICK_MS = 33;
/** Split-attack boost window (ms) — forward launch for absorb. */
export const AGAR_SPLIT_BOOST_MS = 640;
/** Virus base mass / visual size. */
export const AGAR_VIRUS_MASS = 100;
/** Large cell must exceed this mass to pop on virus (not instant death). */
export const AGAR_VIRUS_POP_MIN = 130;
/** Fragments created when a large cell hits a virus (player pieces + food). */
export const AGAR_VIRUS_FRAGMENTS = 8;
/** Hard cap on edible food pieces from one virus pop (comeback fuel). */
export const AGAR_MAX_VIRUS_FOOD_FRAGS = 12;
/** Soft target virus count on ~2× map (paths retuned; not 2× of 10). */
export const AGAR_VIRUS_TARGET = 14;
/** Hard cap — feeding must not flood the map. */
export const AGAR_VIRUS_MAX = 18;
/** Feed mass at which a virus shoots a new virus (or grows if at cap). */
export const AGAR_VIRUS_SHOOT_MASS = 175;
/** Small balance loss on virus pop (conservation still ≈ before). */
export const AGAR_VIRUS_POP_LOSS = 0.06;
/** Gem tier masses: small +1 · medium +2 · large +3. */
export const AGAR_GEM_SMALL = 1;
export const AGAR_GEM_MEDIUM = 2;
export const AGAR_GEM_LARGE = 3;
/** Early-game ring of small gems around the local spawn. */
export const AGAR_EARLY_GEM_COUNT = 16;
/** Board / grid tone — shared visual target for Snake WORLD map. */
export const AGAR_BOARD_BG = "#0b1220";
export const AGAR_GRID_LINE = "rgba(255,255,255,0.04)";

const COLORS = [
  "#22d3ee", "#a78bfa", "#f472b6", "#fbbf24", "#34d399",
  "#60a5fa", "#fb7185", "#c084fc", "#4ade80", "#f97316",
];

export type Vec = { x: number; y: number };

export type AgarFood = {
  id: string;
  x: number;
  y: number;
  mass: number;
  color: string;
  /** Moving eject pellet velocity (world units / tick). */
  vx?: number;
  vy?: number;
  /** Remaining glide ticks; undefined/0 = static. */
  glide?: number;
  /** Render / feed hint — eject pellets feed viruses. */
  kind?: "food" | "eject" | "frag";
};

/** Spiky virus / bomb — distinct from food pellets and player cells. */
export type AgarVirus = {
  id: string;
  x: number;
  y: number;
  mass: number;
  /** Last feed direction (for shoot spawn). */
  feedDirX?: number;
  feedDirY?: number;
};

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
  /** Last successful Space split (cooldown gate). */
  lastSplitAt?: number;
};

export type AgarAiDifficulty = "easy" | "normal" | "hard";

/** Fewer / normal / more bots by session difficulty (~1.4× FUN-003 for 2× map). */
export function agarBotCountForDifficulty(tier: AgarAiDifficulty = "normal"): number {
  if (tier === "easy") return 18;
  if (tier === "hard") return 34;
  return AGAR_BOT_COUNT;
}

export type AgarWorld = {
  tick: number;
  size: number;
  food: AgarFood[];
  viruses: AgarVirus[];
  players: Record<string, AgarPlayer>;
  rankings: Array<{ id: string; nickname: string; mass: number; color: string }>;
  /** Entry AI tier — Easy food-first / Normal chase / Hard split. */
  aiDifficulty?: AgarAiDifficulty;
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

/** Size → speed curve (exported for QA / HUD feel checks). */
export function speedForMass(mass: number): number {
  // small★★★★★ (~4.5) · mid★★★ (~2.5) · large★ (~1.4) — clear feel gap
  return clamp(28 / Math.sqrt(mass + 8), 0.95, 5.0);
}

function randPos(size: number): Vec {
  const m = 40;
  return { x: m + Math.random() * (size - m * 2), y: m + Math.random() * (size - m * 2) };
}

function foodColor(tier: 1 | 2 | 3 = 1): string {
  if (tier === 3) {
    const palette = ["#fbbf24", "#f59e0b", "#fcd34d"];
    return palette[Math.floor(Math.random() * palette.length)]!;
  }
  if (tier === 2) {
    const palette = ["#a5b4fc", "#67e8f9", "#c4b5fd"];
    return palette[Math.floor(Math.random() * palette.length)]!;
  }
  const palette = ["#fde68a", "#86efac", "#fda4af", "#a5b4fc", "#67e8f9"];
  return palette[Math.floor(Math.random() * palette.length)]!;
}

/** Pick gem mass: mostly small, some medium, sparse large (mid/late growth). */
function rollGemMass(): { mass: number; tier: 1 | 2 | 3 } {
  const r = Math.random();
  if (r < 0.72) return { mass: AGAR_GEM_SMALL, tier: 1 };
  if (r < 0.92) return { mass: AGAR_GEM_MEDIUM, tier: 2 };
  return { mass: AGAR_GEM_LARGE, tier: 3 };
}

/** Pixel diameter for static gem render (tiers differ visually). */
export function gemRenderSize(mass: number): number {
  if (mass >= AGAR_GEM_LARGE) return 10;
  if (mass >= AGAR_GEM_MEDIUM) return 7;
  return 4;
}

let foodSeq = 0;
let virusSeq = 0;

function spawnFood(world: AgarWorld, n: number): void {
  for (let i = 0; i < n; i++) {
    const pos = randPos(world.size);
    const { mass, tier } = rollGemMass();
    world.food.push({
      id: `f${foodSeq++}`,
      x: pos.x,
      y: pos.y,
      mass,
      color: foodColor(tier),
      kind: "food",
    });
  }
}

/** Dense small gems near spawn — "ate a few → grew → entered the game". */
function seedEarlyGems(world: AgarWorld, x: number, y: number): void {
  for (let i = 0; i < AGAR_EARLY_GEM_COUNT; i++) {
    const ang = (Math.PI * 2 * i) / AGAR_EARLY_GEM_COUNT + Math.random() * 0.2;
    const dist = 28 + Math.random() * 95;
    world.food.push({
      id: `f${foodSeq++}`,
      x: clamp(x + Math.cos(ang) * dist, 8, world.size - 8),
      y: clamp(y + Math.sin(ang) * dist, 8, world.size - 8),
      mass: AGAR_GEM_SMALL,
      color: foodColor(1),
      kind: "food",
    });
  }
}

/**
 * Limited viruses: center cluster + mid-path + edge (scaled to world size).
 * Optional regen only up to AGAR_VIRUS_TARGET — feed can grow to AGAR_VIRUS_MAX.
 */
function spawnViruses(world: AgarWorld): void {
  const s = world.size;
  const half = s / 2;
  // Near-center hazards (primary competitive risk for #1) — offsets scale with map
  const near = s * 0.06;
  const fixed: Vec[] = [
    { x: half, y: half },
    { x: half - near, y: half + near * 0.7 },
    { x: half + near * 0.85, y: half - near * 0.65 },
    { x: half + near * 0.4, y: half + near },
    // mid-path
    { x: s * 0.25, y: s * 0.25 },
    { x: s * 0.75, y: s * 0.25 },
    { x: s * 0.25, y: s * 0.75 },
    { x: s * 0.75, y: s * 0.75 },
    { x: s * 0.5, y: s * 0.35 },
    { x: s * 0.5, y: s * 0.65 },
    // edge / corridor
    { x: half, y: s * 0.1 },
    { x: half, y: s * 0.9 },
    { x: s * 0.1, y: half },
    { x: s * 0.9, y: half },
  ];
  for (const pos of fixed) {
    if (world.viruses.length >= AGAR_VIRUS_TARGET) break;
    world.viruses.push({
      id: `v${virusSeq++}`,
      x: pos.x,
      y: pos.y,
      mass: AGAR_VIRUS_MASS,
    });
  }
  while (world.viruses.length < AGAR_VIRUS_TARGET) {
    const pos = randPos(s);
    world.viruses.push({
      id: `v${virusSeq++}`,
      x: pos.x,
      y: pos.y,
      mass: AGAR_VIRUS_MASS,
    });
  }
}

function makePlayer(
  id: string,
  nickname: string,
  isBot: boolean,
  size: number,
  colorIdx: number,
  startMass = AGAR_START_MASS
): AgarPlayer {
  const pos = randPos(size);
  return {
    id,
    nickname,
    color: COLORS[colorIdx % COLORS.length]!,
    alive: true,
    isBot,
    cells: [{ x: pos.x, y: pos.y, mass: startMass }],
    aimX: pos.x,
    aimY: pos.y,
    score: 0,
    lastSplitAt: 0,
  };
}

export function createAgarWorld(
  localId: string,
  nickname: string,
  aiDifficulty: AgarAiDifficulty = "normal"
): AgarWorld {
  const world: AgarWorld = {
    tick: 0,
    size: AGAR_WORLD,
    food: [],
    viruses: [],
    players: {},
    rankings: [],
    aiDifficulty,
  };
  world.players[localId] = makePlayer(localId, nickname || "You", false, world.size, 0);
  spawnFood(world, AGAR_FOOD_TARGET);
  spawnViruses(world);
  const local = world.players[localId]!;
  const localCell = local.cells[0]!;
  seedEarlyGems(world, localCell.x, localCell.y);
  const botCount = agarBotCountForDifficulty(aiDifficulty);
  for (let i = 0; i < botCount; i++) {
    const id = `bot:${i}`;
    // Seed competing leaders so #1 cannot freeze forever
    const boost =
      i === 0
        ? 260
        : i === 1
          ? 240
          : i === 2
            ? 210
            : i % 5 === 0
              ? 130
              : i % 3 === 0
                ? 75
                : AGAR_START_MASS;
    const bot = makePlayer(id, `Cell${i + 1}`, true, world.size, i + 1, boost);
    // Place early leaders near virus paths so mistakes create rank flips
    if (i < 3 && world.viruses[i]) {
      const v = world.viruses[i]!;
      const ang = Math.random() * Math.PI * 2;
      const orbit = world.size * 0.045;
      bot.cells[0]!.x = clamp(v.x + Math.cos(ang) * orbit, 40, world.size - 40);
      bot.cells[0]!.y = clamp(v.y + Math.sin(ang) * orbit, 40, world.size - 40);
      bot.aimX = v.x;
      bot.aimY = v.y;
    }
    world.players[id] = bot;
  }
  updateRankings(world);
  return world;
}

export function setPlayerAim(world: AgarWorld, playerId: string, x: number, y: number): void {
  const p = world.players[playerId];
  if (!p || !p.alive) return;
  p.aimX = clamp(x, 0, world.size);
  p.aimY = clamp(y, 0, world.size);
}

export function canSplitPlayer(world: AgarWorld, playerId: string, now = Date.now()): boolean {
  const p = world.players[playerId];
  if (!p || !p.alive) return false;
  if (p.cells.length >= AGAR_MAX_CELLS) return false;
  if ((p.lastSplitAt ?? 0) + AGAR_SPLIT_COOLDOWN_MS > now) return false;
  return p.cells.some(
    (c) => c.mass >= AGAR_MIN_SPLIT_MASS && c.mass / 2 >= AGAR_MIN_CELL_AFTER_SPLIT
  );
}

export function splitPlayer(world: AgarWorld, playerId: string, now = Date.now()): void {
  const p = world.players[playerId];
  if (!p || !p.alive) return;
  if (p.cells.length >= AGAR_MAX_CELLS) return;
  if ((p.lastSplitAt ?? 0) + AGAR_SPLIT_COOLDOWN_MS > now) return;

  const next: AgarCell[] = [];
  let didSplit = false;
  for (const cell of p.cells) {
    const half = cell.mass / 2;
    // Cap pieces; refuse crumbs; one Space may split multiple eligible cells until max.
    if (
      cell.mass < AGAR_MIN_SPLIT_MASS ||
      half < AGAR_MIN_CELL_AFTER_SPLIT ||
      next.length + 1 >= AGAR_MAX_CELLS
    ) {
      next.push(cell);
      continue;
    }
    cell.mass = half;
    const ang = Math.atan2(p.aimY - cell.y, p.aimX - cell.x);
    const dirX = Math.cos(ang);
    const dirY = Math.sin(ang);
    const r = massToRadius(half);
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
    didSplit = true;
  }
  if (didSplit) {
    p.lastSplitAt = now;
    p.cells = next.slice(0, AGAR_MAX_CELLS);
  }
}

/**
 * W eject — mass flies BACKWARD (opposite movement / aim direction).
 * Pellets MOVE visibly, are edible by others, and can feed viruses.
 */
export function ejectMass(world: AgarWorld, playerId: string): void {
  const p = world.players[playerId];
  if (!p || !p.alive) return;
  for (const cell of p.cells) {
    if (cell.mass < AGAR_MIN_EJECT_MASS) continue;
    cell.mass -= AGAR_EJECT_COST;
    const ang = Math.atan2(p.aimY - cell.y, p.aimX - cell.x);
    // Opposite of movement direction (chase feed / flee shed)
    const back = ang + Math.PI;
    const dirX = Math.cos(back);
    const dirY = Math.sin(back);
    const r = massToRadius(cell.mass);
    const dist = r + 14;
    world.food.push({
      id: `e${foodSeq++}`,
      x: clamp(cell.x + dirX * dist, 4, world.size - 4),
      y: clamp(cell.y + dirY * dist, 4, world.size - 4),
      mass: AGAR_EJECT_FOOD,
      color: p.color,
      vx: dirX * AGAR_EJECT_SPEED,
      vy: dirY * AGAR_EJECT_SPEED,
      glide: AGAR_EJECT_GLIDE_TICKS,
      kind: "eject",
    });
  }
}

/**
 * Mass decay — idle #1 shrinks without eating.
 * small ≈ none · mid slight · large noticeable · huge significant.
 */
function applyMassDecay(cell: AgarCell, dtSec: number): void {
  const m = cell.mass;
  if (m < 70) return;
  let rate = 0;
  if (m < 150) rate = 0.006; // slight ~0.6%/s
  else if (m < 300) rate = 0.018; // mid
  else if (m < 550) rate = 0.032; // large noticeable
  else rate = 0.05; // huge significant
  const next = m * (1 - rate * dtSec);
  cell.mass = Math.max(AGAR_START_MASS * 0.85, next);
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

/** Glide eject pellets so W is never a silent no-op. */
function moveEjectPellets(world: AgarWorld): void {
  for (const f of world.food) {
    if (!f.glide || f.glide <= 0) continue;
    if (f.vx == null || f.vy == null) continue;
    f.x = clamp(f.x + f.vx, 4, world.size - 4);
    f.y = clamp(f.y + f.vy, 4, world.size - 4);
    f.vx *= 0.94;
    f.vy *= 0.94;
    f.glide -= 1;
    if (f.glide <= 0) {
      f.vx = 0;
      f.vy = 0;
    }
  }
}

/**
 * W pellets feed viruses → grow; at threshold spawn a new virus (or grow if at cap).
 */
function tryVirusFeed(world: AgarWorld): void {
  for (const virus of world.viruses) {
    const vr = massToRadius(virus.mass);
    for (let i = world.food.length - 1; i >= 0; i--) {
      const f = world.food[i]!;
      if (f.kind !== "eject" && !f.id.startsWith("e")) continue;
      if (Math.hypot(f.x - virus.x, f.y - virus.y) > vr + 6) continue;
      virus.mass += f.mass * 0.95;
      if (f.vx != null && f.vy != null && (Math.abs(f.vx) > 0.1 || Math.abs(f.vy) > 0.1)) {
        const len = Math.hypot(f.vx, f.vy) || 1;
        virus.feedDirX = f.vx / len;
        virus.feedDirY = f.vy / len;
      } else {
        const dx = f.x - virus.x;
        const dy = f.y - virus.y;
        const len = Math.hypot(dx, dy) || 1;
        virus.feedDirX = dx / len;
        virus.feedDirY = dy / len;
      }
      world.food.splice(i, 1);

      if (virus.mass >= AGAR_VIRUS_SHOOT_MASS) {
        if (world.viruses.length < AGAR_VIRUS_MAX) {
          const dirX = virus.feedDirX ?? 1;
          const dirY = virus.feedDirY ?? 0;
          const shootDist = massToRadius(AGAR_VIRUS_MASS) * 2.8 + 28;
          world.viruses.push({
            id: `v${virusSeq++}`,
            x: clamp(virus.x + dirX * shootDist, 30, world.size - 30),
            y: clamp(virus.y + dirY * shootDist, 30, world.size - 30),
            mass: AGAR_VIRUS_MASS,
          });
          virus.mass = AGAR_VIRUS_MASS;
        } else {
          // At cap: grow size as strategic hazard, soft-cap mass
          virus.mass = Math.min(virus.mass, AGAR_VIRUS_SHOOT_MASS * 1.35);
        }
      }
    }
  }
}

function botAim(world: AgarWorld, bot: AgarPlayer): void {
  const head = bot.cells[0];
  if (!head) return;
  const myMass = totalMass(bot);
  const tier = world.aiDifficulty ?? "normal";
  const avoidMul = tier === "easy" ? 1.05 : tier === "hard" ? 1.2 : 1.12;
  const avoidRange = tier === "easy" ? 140 : tier === "hard" ? 220 : 180;
  const preyRange = tier === "easy" ? 130 : tier === "hard" ? 260 : 200;
  const preyMassMul = tier === "easy" ? 0.7 : tier === "hard" ? 0.95 : 0.88;
  const chasePrey = tier !== "easy";

  // Large bots steer clear of viruses when oversized — but sometimes mistake (rank flips)
  if (myMass >= AGAR_VIRUS_POP_MIN) {
    for (const v of world.viruses) {
      const d = Math.hypot(v.x - head.x, v.y - head.y);
      if (d < massToRadius(v.mass) + massToRadius(head.mass) + 40) {
        const mistakeChance = myMass > 400 ? 0.28 : myMass > 250 ? 0.18 : 0.1;
        if (Math.random() < mistakeChance) {
          // Charge the virus — creates pop drama / TOP10 churn
          bot.aimX = v.x;
          bot.aimY = v.y;
          return;
        }
        bot.aimX = clamp(head.x - (v.x - head.x) * 1.6, 0, world.size);
        bot.aimY = clamp(head.y - (v.y - head.y) * 1.6, 0, world.size);
        return;
      }
    }
  }

  // Avoid larger cells first
  for (const other of Object.values(world.players)) {
    if (other.id === bot.id || !other.alive) continue;
    const o = other.cells[0];
    if (!o) continue;
    if (totalMass(other) > myMass * avoidMul) {
      const d = Math.hypot(o.x - head.x, o.y - head.y);
      if (d < avoidRange) {
        bot.aimX = clamp(head.x - (o.x - head.x) * 1.4, 0, world.size);
        bot.aimY = clamp(head.y - (o.y - head.y) * 1.4, 0, world.size);
        return;
      }
    }
  }

  // Chase smaller cells (Normal/Hard) — Easy prefers food
  if (chasePrey) {
    let prey: AgarPlayer | null = null;
    let preyD = preyRange;
    for (const other of Object.values(world.players)) {
      if (other.id === bot.id || !other.alive) continue;
      const oMass = totalMass(other);
      if (oMass >= myMass * preyMassMul) continue;
      const o = other.cells[0];
      if (!o) continue;
      const d = Math.hypot(o.x - head.x, o.y - head.y);
      if (d < preyD) {
        preyD = d;
        prey = other;
      }
    }
    if (prey?.cells[0] && preyD < preyRange - 10) {
      bot.aimX = prey.cells[0].x;
      bot.aimY = prey.cells[0].y;
      return;
    }
  }

  // Prefer nearby food (and ejected / virus fragments)
  let best: AgarFood | null = null;
  let bestD = tier === "easy" ? 280 : 230;
  for (const f of world.food) {
    const d = Math.hypot(f.x - head.x, f.y - head.y);
    // Prefer richer fragments (comeback food)
    const score = d - f.mass * 2;
    if (score < bestD) {
      bestD = score;
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

/** Split-attack: Hard only (Normal rare, Easy never). */
function botMaybeSplit(world: AgarWorld, bot: AgarPlayer, now: number): void {
  const tier = world.aiDifficulty ?? "normal";
  if (tier === "easy") return;
  const head = bot.cells[0];
  if (!head || head.mass < AGAR_MIN_SPLIT_MASS) return;
  if (bot.cells.length >= 4) return;
  if (world.tick % 17 !== (bot.id.charCodeAt(0) % 17)) return;
  const myMass = totalMass(bot);
  const splitChance = tier === "hard" ? 0.12 : 0.035;
  const maxDist = tier === "hard" ? 120 : 95;
  for (const other of Object.values(world.players)) {
    if (!other.alive || other.id === bot.id) continue;
    if (totalMass(other) > myMass * 0.7) continue;
    const o = other.cells[0];
    if (!o) continue;
    const d = Math.hypot(o.x - head.x, o.y - head.y);
    if (d > 35 && d < maxDist && Math.random() < splitChance) {
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
      kind: "frag",
    });
  }
}

/**
 * Large cell + virus → forced split into many smaller cells (NOT death).
 * Mass conservation: sum(cells + food frags) ≈ total * (1 - small loss).
 * Overflow / reserved share becomes edible fragments for smaller players (comeback).
 */
function popCellOnVirus(
  world: AgarWorld,
  player: AgarPlayer,
  cellIndex: number,
  virus: AgarVirus,
  now: number
): void {
  const cell = player.cells[cellIndex];
  if (!cell) return;
  const total = cell.mass;
  const budget = total * (1 - AGAR_VIRUS_POP_LOSS);
  const fragCount = Math.min(
    AGAR_VIRUS_FRAGMENTS,
    Math.max(4, Math.floor(budget / AGAR_MIN_CELL_AFTER_SPLIT))
  );
  const room = Math.max(0, AGAR_MAX_CELLS - (player.cells.length - 1));
  // Keep most mass as player pieces; reserve ~40% as edible comeback fuel when room allows,
  // or more when cell-capped so fragments always exist for scenario B.
  const preferCells = Math.min(fragCount, Math.max(1, room));
  let keepAsCells = preferCells;
  let foodPieceCount = fragCount - keepAsCells;
  // Always leave some edible mass for nearby smaller players
  if (foodPieceCount < 3 && budget > 40) {
    const steal = Math.min(3 - foodPieceCount, Math.max(0, keepAsCells - 2));
    keepAsCells -= steal;
    foodPieceCount += steal;
  }
  foodPieceCount = Math.min(AGAR_MAX_VIRUS_FOOD_FRAGS, Math.max(2, foodPieceCount));
  const cellShare = budget * (keepAsCells / (keepAsCells + foodPieceCount));
  const foodShare = budget - cellShare;
  const perCell = cellShare / keepAsCells;
  const perFood = foodShare / foodPieceCount;

  const newCells: AgarCell[] = [];
  for (let i = 0; i < keepAsCells; i++) {
    const ang = (Math.PI * 2 * i) / fragCount + Math.random() * 0.15;
    const dist = massToRadius(virus.mass) + massToRadius(perCell) + 8 + Math.random() * 10;
    newCells.push({
      x: clamp(virus.x + Math.cos(ang) * dist, 4, world.size - 4),
      y: clamp(virus.y + Math.sin(ang) * dist, 4, world.size - 4),
      mass: perCell,
      boostUntil: now + 380,
      boostDirX: Math.cos(ang),
      boostDirY: Math.sin(ang),
      mergeAt: now + 10_000,
    });
  }
  for (let i = 0; i < foodPieceCount; i++) {
    const ang = (Math.PI * 2 * (keepAsCells + i)) / Math.max(1, keepAsCells + foodPieceCount) + 0.35;
    const dist = 22 + Math.random() * 36;
    world.food.push({
      id: `vf${foodSeq++}`,
      x: clamp(virus.x + Math.cos(ang) * dist, 4, world.size - 4),
      y: clamp(virus.y + Math.sin(ang) * dist, 4, world.size - 4),
      mass: Math.max(2, perFood),
      color: i % 2 === 0 ? player.color : "#86efac",
      kind: "frag",
    });
  }

  player.cells.splice(cellIndex, 1, ...newCells);
  if (player.cells.length > AGAR_MAX_CELLS) {
    const overflow = player.cells.splice(AGAR_MAX_CELLS);
    for (const o of overflow) {
      world.food.push({
        id: `vo${foodSeq++}`,
        x: o.x,
        y: o.y,
        mass: Math.max(2, o.mass),
        color: player.color,
        kind: "frag",
      });
    }
  }
}

function tryVirusCollisions(world: AgarWorld, now: number): void {
  for (const player of Object.values(world.players)) {
    if (!player.alive) continue;
    for (let ci = player.cells.length - 1; ci >= 0; ci--) {
      const cell = player.cells[ci]!;
      if (cell.mass < AGAR_VIRUS_POP_MIN) continue;
      const cr = massToRadius(cell.mass);
      for (const virus of world.viruses) {
        const vr = massToRadius(virus.mass);
        const d = Math.hypot(cell.x - virus.x, cell.y - virus.y);
        // Must overlap meaningfully — large swallows/hits virus → pop
        if (d < cr - vr * 0.15) {
          popCellOnVirus(world, player, ci, virus, now);
          break;
        }
      }
    }
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
          prey.lastSplitAt = 0;
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
  const dtSec = AGAR_TICK_MS / 1000;

  moveEjectPellets(world);
  tryVirusFeed(world);

  for (const p of Object.values(world.players)) {
    if (!p.alive) continue;
    if (p.isBot) {
      botAim(world, p);
      botMaybeSplit(world, p, now);
    }
    for (const cell of p.cells) {
      applyMassDecay(cell, dtSec);
      moveCell(cell, p.aimX, p.aimY, world.size, now);
    }
    mergeOwnCells(p, now);
    tryEatFood(world, p);
  }
  tryVirusCollisions(world, now);
  tryEatPlayers(world, now);

  if (world.food.length < AGAR_FOOD_TARGET * 0.7) {
    spawnFood(world, Math.min(36, AGAR_FOOD_TARGET - world.food.length));
  }
  // Soft regen only toward target — never above max from accidental wipe
  if (world.viruses.length < AGAR_VIRUS_TARGET) {
    spawnViruses(world);
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
    lastSplitAt: 0,
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

/** Debug / QA helpers */
export function countCells(world: AgarWorld): number {
  return Object.values(world.players).reduce((n, p) => n + (p.alive ? p.cells.length : 0), 0);
}

/** Count gems by mass tier (static food only; excludes eject/frag). */
export function countGemTiers(world: AgarWorld): { small: number; medium: number; large: number; total: number } {
  let small = 0;
  let medium = 0;
  let large = 0;
  for (const f of world.food) {
    if (f.kind === "eject" || f.kind === "frag") continue;
    if (f.mass >= AGAR_GEM_LARGE) large += 1;
    else if (f.mass >= AGAR_GEM_MEDIUM) medium += 1;
    else small += 1;
  }
  return { small, medium, large, total: small + medium + large };
}

/** Viewport cull helper — true if point is inside padded camera view. */
export function inViewport(
  x: number,
  y: number,
  camX: number,
  camY: number,
  viewSize: number,
  pad = 48
): boolean {
  const half = viewSize / 2 + pad;
  return x >= camX - half && x <= camX + half && y >= camY - half && y <= camY + half;
}

/** Sum of player cell mass + food mass tagged as virus frags (for conservation probes). */
export function sumPoppedMass(player: AgarPlayer, food: AgarFood[], fragIds: Set<string>): number {
  const cellMass = totalMass(player);
  let foodMass = 0;
  for (const f of food) {
    if (fragIds.has(f.id) || f.kind === "frag") foodMass += f.mass;
  }
  return cellMass + foodMass;
}
