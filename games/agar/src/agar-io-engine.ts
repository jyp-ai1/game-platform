/**
 * Agar competitive engine — mass decay · virus pop · split · backward eject · size/speed.
 * Host-authoritative world shape (ready for Room sync in a follow-up).
 */

export const AGAR_WORLD = 900;
export const AGAR_FOOD_TARGET = 220;
export const AGAR_BOT_COUNT = 18;
/** Tuned minimum so first eats / presence feel quick (not Snake L10). */
export const AGAR_START_MASS = 36;
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
export const AGAR_TICK_MS = 33;
/** Split-attack boost window (ms) — forward launch for absorb. */
export const AGAR_SPLIT_BOOST_MS = 640;
/** Virus pop: large cell must exceed this mass to pop (not instant death). */
export const AGAR_VIRUS_MASS = 100;
export const AGAR_VIRUS_POP_MIN = 130;
/** Fragments created when a large cell hits a virus. */
export const AGAR_VIRUS_FRAGMENTS = 8;
/** Target virus count on the map (center + paths + random). */
export const AGAR_VIRUS_TARGET = 11;
/** Board / grid tone — shared visual target for Snake WORLD map. */
export const AGAR_BOARD_BG = "#0b1220";
export const AGAR_GRID_LINE = "rgba(255,255,255,0.04)";

const COLORS = [
  "#22d3ee", "#a78bfa", "#f472b6", "#fbbf24", "#34d399",
  "#60a5fa", "#fb7185", "#c084fc", "#4ade80", "#f97316",
];

export type Vec = { x: number; y: number };

export type AgarFood = { id: string; x: number; y: number; mass: number; color: string };

/** Spiky virus / bomb — distinct from food pellets and player cells. */
export type AgarVirus = {
  id: string;
  x: number;
  y: number;
  mass: number;
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

/** Fewer / normal / more bots by session difficulty. */
export function agarBotCountForDifficulty(tier: AgarAiDifficulty = "normal"): number {
  if (tier === "easy") return 12;
  if (tier === "hard") return 24;
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

function randPos(size: number): Vec {
  const m = 40;
  return { x: m + Math.random() * (size - m * 2), y: m + Math.random() * (size - m * 2) };
}

function foodColor(): string {
  const palette = ["#fde68a", "#86efac", "#fda4af", "#a5b4fc", "#67e8f9"];
  return palette[Math.floor(Math.random() * palette.length)]!;
}

let foodSeq = 0;
let virusSeq = 0;

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

/**
 * Place limited viruses: world center + key mid-paths + a few random.
 * Replaces any prior "big center circle" concept — this IS the center hazard.
 */
function spawnViruses(world: AgarWorld): void {
  const s = world.size;
  const half = s / 2;
  const fixed: Vec[] = [
    { x: half, y: half }, // center — primary competitive hazard
    { x: s * 0.25, y: s * 0.25 },
    { x: s * 0.75, y: s * 0.25 },
    { x: s * 0.25, y: s * 0.75 },
    { x: s * 0.75, y: s * 0.75 },
    { x: half, y: s * 0.2 },
    { x: half, y: s * 0.8 },
    { x: s * 0.2, y: half },
    { x: s * 0.8, y: half },
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
    // Keep random viruses away from spawn-crowded edges slightly
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
      bot.cells[0]!.x = clamp(v.x + Math.cos(ang) * 70, 40, world.size - 40);
      bot.cells[0]!.y = clamp(v.y + Math.sin(ang) * 70, 40, world.size - 40);
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
 * Chasees feed pursuers behind them, bait, or shed mass while fleeing.
 */
export function ejectMass(world: AgarWorld, playerId: string): void {
  const p = world.players[playerId];
  if (!p || !p.alive) return;
  for (const cell of p.cells) {
    if (cell.mass < AGAR_MIN_EJECT_MASS) continue;
    cell.mass -= AGAR_EJECT_COST;
    const ang = Math.atan2(p.aimY - cell.y, p.aimX - cell.x);
    // Opposite of movement direction
    const back = ang + Math.PI;
    const r = massToRadius(cell.mass);
    const dist = r + 12;
    world.food.push({
      id: `e${foodSeq++}`,
      x: clamp(cell.x + Math.cos(back) * dist, 4, world.size - 4),
      y: clamp(cell.y + Math.sin(back) * dist, 4, world.size - 4),
      mass: AGAR_EJECT_FOOD,
      color: p.color,
    });
  }
}

/**
 * Size → speed: small = fast, mid = normal, large = slow.
 * Stronger curve than MVP so huge #1 feels sluggish vs tiny comeback.
 */
function speedForMass(mass: number): number {
  // ~4.8 at mass 20 · ~3.0 at 80 · ~1.8 at 250 · ~1.05 at 800+
  return clamp(5.1 - Math.log2(mass + 1) * 0.72, 1.0, 4.9);
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

function botAim(world: AgarWorld, bot: AgarPlayer): void {
  const head = bot.cells[0];
  if (!head) return;
  const myMass = totalMass(bot);
  const tier = world.aiDifficulty ?? "normal";
  const avoidMul = tier === "easy" ? 1.05 : tier === "hard" ? 1.2 : 1.12;
  const avoidRange = tier === "easy" ? 110 : tier === "hard" ? 170 : 140;
  const preyRange = tier === "easy" ? 100 : tier === "hard" ? 200 : 160;
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
  let bestD = tier === "easy" ? 220 : 180;
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
    });
  }
}

/**
 * Large cell + virus → split into multiple smaller cells (NOT death).
 * Overflow beyond max cells becomes edible food fragments for comeback.
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
  const fragCount = Math.min(
    AGAR_VIRUS_FRAGMENTS,
    Math.max(4, Math.floor(total / AGAR_MIN_CELL_AFTER_SPLIT))
  );
  const per = total / fragCount;
  const room = Math.max(0, AGAR_MAX_CELLS - (player.cells.length - 1));
  const keepAsCells = Math.min(fragCount, Math.max(1, room));
  const foodFrags = fragCount - keepAsCells;

  const newCells: AgarCell[] = [];
  for (let i = 0; i < keepAsCells; i++) {
    const ang = (Math.PI * 2 * i) / fragCount + Math.random() * 0.15;
    const dist = massToRadius(virus.mass) + massToRadius(per) + 8 + Math.random() * 10;
    newCells.push({
      x: clamp(virus.x + Math.cos(ang) * dist, 4, world.size - 4),
      y: clamp(virus.y + Math.sin(ang) * dist, 4, world.size - 4),
      mass: per,
      boostUntil: now + 380,
      boostDirX: Math.cos(ang),
      boostDirY: Math.sin(ang),
      mergeAt: now + 10_000,
    });
  }
  // Edible fragments for nearby smaller players — comeback fuel
  for (let i = 0; i < foodFrags; i++) {
    const ang = (Math.PI * 2 * (keepAsCells + i)) / fragCount;
    const dist = 18 + Math.random() * 28;
    world.food.push({
      id: `vf${foodSeq++}`,
      x: clamp(virus.x + Math.cos(ang) * dist, 4, world.size - 4),
      y: clamp(virus.y + Math.sin(ang) * dist, 4, world.size - 4),
      mass: Math.max(3, Math.round(per * 0.85)),
      color: player.color,
    });
  }
  // Always spray edible mass for nearby smaller players (comeback fuel).
  // Keeps ~22% of popped mass as free food even when all fragments stay as cells.
  const spray = Math.min(14, Math.max(6, Math.round(total / 28)));
  const sprayPer = Math.max(3, Math.round((total * 0.22) / spray));
  for (let i = 0; i < spray; i++) {
    const ang = (Math.PI * 2 * i) / spray + 0.4;
    const dist = 36 + Math.random() * 44;
    world.food.push({
      id: `vs${foodSeq++}`,
      x: clamp(virus.x + Math.cos(ang) * dist, 4, world.size - 4),
      y: clamp(virus.y + Math.sin(ang) * dist, 4, world.size - 4),
      mass: sprayPer,
      color: "#86efac",
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
        mass: Math.max(2, Math.round(o.mass * 0.9)),
        color: player.color,
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
    spawnFood(world, Math.min(24, AGAR_FOOD_TARGET - world.food.length));
  }
  // Keep virus count stable if somehow depleted (viruses are hazards, not consumed)
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
