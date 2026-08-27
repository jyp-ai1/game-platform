/** Bomber MVP — 2–8p grid, bomb, blast, death, round, TOP LB.
 * BOMBER-FUN-001 — Round 1→3 escalation (map / fuse / AI / speed / blast / power-ups).
 */

export const BOMBER_COLS = 13;
export const BOMBER_ROWS = 11;
export const BOMBER_TICK_MS = 50;
export const BOMBER_MIN_PLAYERS = 2;
export const BOMBER_MAX_PLAYERS = 8;
export const BOMBER_BOMB_FUSE_MS = 1800;
export const BOMBER_BLAST_MS = 420;
export const BOMBER_RANGE = 2;
export const BOMBER_MAX_ROUNDS = 3;

export type Cell = "empty" | "soft" | "hard";

export type BomberPlayer = {
  id: string;
  nickname: string;
  color: string;
  x: number;
  y: number;
  alive: boolean;
  isBot: boolean;
  bombsMax: number;
  bombsLeft: number;
  kills: number;
  wins: number;
  /** Power-up: extra blast tiles (0–2). Reset each round. */
  blastBonus?: number;
  /** Power-up: bonus move per keypress (0–2). Reset each round. */
  speedBonus?: number;
};

export type PowerUpKind = "bomb" | "speed" | "range";

export type PowerUp = {
  id: string;
  kind: PowerUpKind;
  x: number;
  y: number;
};

export type Bomb = {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  plantedAt: number;
  range: number;
};

export type Blast = {
  id: string;
  cells: Array<{ x: number; y: number }>;
  until: number;
};

export type RoundDifficulty = {
  label: string;
  botCount: number;
  /** Lower = faster AI moves */
  aiTickEvery: number;
  aiBombChance: number;
  /** Chance to plant when lined up with a living opponent */
  aiHuntChance: number;
  softDensity: number;
  timeLimitSec: number;
  bombRange: number;
  bombsMax: number;
  fuseMs: number;
  /** Soft-block break → power-up drop rate */
  powerUpChance: number;
  /** Starting speedBonus for all players this round (0–1) */
  baseSpeedBonus: number;
};

/** Round ladder: Easy → Normal → Hard → Very Hard.
 * Closed Alpha starts at Normal; FUN-001 raises Normal+ above prior “place bomb, kill AI”.
 */
export const ROUND_DIFFICULTY: RoundDifficulty[] = [
  {
    label: "easy",
    botCount: 2,
    aiTickEvery: 16,
    aiBombChance: 0.01,
    aiHuntChance: 0.15,
    softDensity: 0.42,
    timeLimitSec: 95,
    bombRange: 2,
    bombsMax: 1,
    fuseMs: 2100,
    powerUpChance: 0.2,
    baseSpeedBonus: 0,
  },
  {
    // Round 1 @ Normal tier — active bots, learnable fuse
    label: "normal",
    botCount: 3,
    aiTickEvery: 8,
    aiBombChance: 0.032,
    aiHuntChance: 0.42,
    softDensity: 0.56,
    timeLimitSec: 70,
    bombRange: 2,
    bombsMax: 1,
    fuseMs: 1850,
    powerUpChance: 0.26,
    baseSpeedBonus: 0,
  },
  {
    // Round 2 — denser map, shorter fuse, more bombs + hunt
    label: "hard",
    botCount: 4,
    aiTickEvery: 5,
    aiBombChance: 0.058,
    aiHuntChance: 0.62,
    softDensity: 0.65,
    timeLimitSec: 52,
    bombRange: 3,
    bombsMax: 2,
    fuseMs: 1500,
    powerUpChance: 0.36,
    baseSpeedBonus: 0,
  },
  {
    // Round 3 — survival pressure: fast AI, wide blast, power-ups + speed
    label: "very-hard",
    botCount: 5,
    aiTickEvery: 3,
    aiBombChance: 0.095,
    aiHuntChance: 0.78,
    softDensity: 0.74,
    timeLimitSec: 38,
    bombRange: 4,
    bombsMax: 3,
    fuseMs: 1250,
    powerUpChance: 0.48,
    baseSpeedBonus: 1,
  },
];

/** Human-readable map names for HUD (index = mapId). */
export const MAP_NAMES = ["Corridors", "Open Center", "Dense Maze", "Lanes"] as const;

/** Closed Alpha default AI tier label = Normal (see getRoundDifficulty). */
export const DEFAULT_AI_TIER = "normal" as const;

export type BomberAiTier = "easy" | "normal" | "hard";

const AI_TIER_INDEX: Record<BomberAiTier, number> = {
  easy: 0,
  normal: 1,
  hard: 2,
};

export type BomberWorld = {
  tick: number;
  round: number;
  maxRounds: number;
  mapId: number;
  cols: number;
  rows: number;
  grid: Cell[][];
  players: Record<string, BomberPlayer>;
  bombs: Bomb[];
  blasts: Blast[];
  rankings: Array<{ id: string; nickname: string; wins: number; kills: number; color: string }>;
  roundOverAt?: number;
  winnerId?: string | null;
  roundStartedAt: number;
  timeLimitSec: number;
  difficulty: RoundDifficulty;
  fuseMs: number;
  matchOver?: boolean;
  /** Entry-selected AI base tier (Easy / Normal / Hard). */
  aiTier: BomberAiTier;
  powerUps: PowerUp[];
};

const POWERUP_EMOJI: Record<PowerUpKind, string> = {
  bomb: "💣",
  speed: "⚡",
  range: "🔥",
};

function maybeSpawnPowerUp(world: BomberWorld, x: number, y: number): void {
  const chance = world.difficulty.powerUpChance ?? 0.28;
  if (Math.random() > chance) return;
  if (world.powerUps.some((p) => p.x === x && p.y === y)) return;
  // Later rounds bias toward range/bomb for survival pressure
  const kinds: PowerUpKind[] =
    world.round >= 3
      ? ["bomb", "range", "range", "speed", "bomb"]
      : world.round >= 2
        ? ["bomb", "speed", "range", "range"]
        : ["bomb", "speed", "range"];
  const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
  world.powerUps.push({ id: `pu-${world.tick}-${x}-${y}`, kind, x, y });
}

function applyPowerUp(p: BomberPlayer, kind: PowerUpKind): void {
  if (kind === "bomb") {
    p.bombsMax = Math.min(5, p.bombsMax + 1);
    p.bombsLeft = Math.min(p.bombsMax, p.bombsLeft + 1);
  } else if (kind === "speed") {
    p.speedBonus = Math.min(2, (p.speedBonus ?? 0) + 1);
  } else if (kind === "range") {
    p.blastBonus = Math.min(2, (p.blastBonus ?? 0) + 1);
  }
}

function resetPlayerPowerUps(p: BomberPlayer, diff: RoundDifficulty): void {
  p.blastBonus = 0;
  p.speedBonus = Math.min(2, Math.max(0, diff.baseSpeedBonus ?? 0));
  p.bombsMax = diff.bombsMax;
  p.bombsLeft = diff.bombsMax;
}

const COLORS = ["#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#a78bfa", "#fb7185", "#60a5fa", "#4ade80"];

export function powerUpEmoji(kind: PowerUpKind): string {
  return POWERUP_EMOJI[kind];
}

const SPAWNS: Array<{ x: number; y: number }> = [
  { x: 1, y: 1 },
  { x: BOMBER_COLS - 2, y: 1 },
  { x: 1, y: BOMBER_ROWS - 2 },
  { x: BOMBER_COLS - 2, y: BOMBER_ROWS - 2 },
  { x: 3, y: 1 },
  { x: BOMBER_COLS - 4, y: BOMBER_ROWS - 2 },
  { x: 1, y: 3 },
  { x: BOMBER_COLS - 2, y: BOMBER_ROWS - 4 },
];

/** 4 fixed soft-wall masks (1=soft). Hard pillars stay on even×even. No RNG. */
const MAP_PRESETS: number[][][] = [
  // classic corridors
  [
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  ],
  // open center
  [
    [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
  ],
  // dense maze
  [
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  ],
  // lanes
  [
    [0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0],
  ],
];

export function getRoundDifficulty(round: number, aiTier: BomberAiTier = DEFAULT_AI_TIER): RoundDifficulty {
  // Scale from entry tier: Easy stays soft; Normal→Hard ladder; Hard escalates faster.
  const base = AI_TIER_INDEX[aiTier] ?? 1;
  const idx = Math.max(0, Math.min(ROUND_DIFFICULTY.length - 1, base + Math.max(0, round - 1)));
  return ROUND_DIFFICULTY[idx]!;
}

function clearSpawnCorners(g: Cell[][]): void {
  const clear = (cx: number, cy: number) => {
    for (let dy = 0; dy <= 2; dy++) {
      for (let dx = 0; dx <= 2; dx++) {
        const x = cx + (cx < BOMBER_COLS / 2 ? dx : -dx);
        const y = cy + (cy < BOMBER_ROWS / 2 ? dy : -dy);
        if (g[y]?.[x] === "soft") g[y]![x] = "empty";
      }
    }
  };
  clear(1, 1);
  clear(BOMBER_COLS - 2, 1);
  clear(1, BOMBER_ROWS - 2);
  clear(BOMBER_COLS - 2, BOMBER_ROWS - 2);
}

function makeGridFromPreset(mapId: number, softDensity: number): Cell[][] {
  const preset = MAP_PRESETS[mapId % MAP_PRESETS.length]!;
  const g: Cell[][] = [];
  for (let y = 0; y < BOMBER_ROWS; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < BOMBER_COLS; x++) {
      if (x === 0 || y === 0 || x === BOMBER_COLS - 1 || y === BOMBER_ROWS - 1) {
        row.push("hard");
        continue;
      }
      if (x % 2 === 0 && y % 2 === 0) {
        row.push("hard");
        continue;
      }
      const marked = preset[y]?.[x] === 1;
      if (!marked) {
        row.push("empty");
        continue;
      }
      // Density gate: lower density thins preset soft cells (still deterministic)
      const keep =
        softDensity >= 0.7
          ? true
          : softDensity >= 0.55
            ? (x + y) % 3 !== 0
            : (x + y) % 2 === 0;
      row.push(keep ? "soft" : "empty");
    }
    g.push(row);
  }
  clearSpawnCorners(g);
  return g;
}

function updateRankings(world: BomberWorld): void {
  world.rankings = Object.values(world.players)
    .map((p) => ({ id: p.id, nickname: p.nickname, wins: p.wins, kills: p.kills, color: p.color }))
    .sort((a, b) => b.wins - a.wins || b.kills - a.kills)
    .slice(0, 8);
}

function syncBotsToDifficulty(
  world: BomberWorld,
  localId: string,
  nickname: string,
  diff: RoundDifficulty
): void {
  const want = Math.max(BOMBER_MIN_PLAYERS - 1, Math.min(BOMBER_MAX_PLAYERS - 1, diff.botCount));
  let bots = Object.values(world.players).filter((p) => p.isBot);

  while (bots.length > want) {
    const drop = bots[bots.length - 1]!;
    delete world.players[drop.id];
    bots = bots.slice(0, -1);
  }

  let nextIdx = 0;
  while (bots.length < want) {
    while (world.players[`bot:${nextIdx}`]) nextIdx += 1;
    const id = `bot:${nextIdx}`;
    const spawn = SPAWNS[(bots.length + 1) % SPAWNS.length]!;
    const bot: BomberPlayer = {
      id,
      nickname: `Bomber${nextIdx + 1}`,
      color: COLORS[(bots.length + 1) % COLORS.length]!,
      x: spawn.x,
      y: spawn.y,
      alive: true,
      isBot: true,
      bombsMax: diff.bombsMax,
      bombsLeft: diff.bombsMax,
      kills: 0,
      wins: world.players[id]?.wins ?? 0,
    };
    world.players[id] = bot;
    bots.push(bot);
    nextIdx += 1;
  }

  if (!world.players[localId]) {
    const spawn = SPAWNS[0]!;
    world.players[localId] = {
      id: localId,
      nickname: nickname || "You",
      color: COLORS[0]!,
      x: spawn.x,
      y: spawn.y,
      alive: true,
      isBot: false,
      bombsMax: diff.bombsMax,
      bombsLeft: diff.bombsMax,
      kills: 0,
      wins: 0,
    };
  }

  for (const p of Object.values(world.players)) {
    resetPlayerPowerUps(p, diff);
  }
}

export function createBomberWorld(
  localId: string,
  nickname: string,
  _botCount = 2,
  aiTier: BomberAiTier = DEFAULT_AI_TIER
): BomberWorld {
  const round = 1;
  const diff = getRoundDifficulty(round, aiTier);
  const mapId = 0;
  const world: BomberWorld = {
    tick: 0,
    round,
    maxRounds: BOMBER_MAX_ROUNDS,
    mapId,
    cols: BOMBER_COLS,
    rows: BOMBER_ROWS,
    grid: makeGridFromPreset(mapId, diff.softDensity),
    players: {},
    bombs: [],
    blasts: [],
    rankings: [],
    roundStartedAt: Date.now(),
    timeLimitSec: diff.timeLimitSec,
    difficulty: diff,
    fuseMs: diff.fuseMs,
    aiTier,
    powerUps: [],
  };
  syncBotsToDifficulty(world, localId, nickname, diff);
  const ids = Object.keys(world.players);
  ids.forEach((id, i) => {
    const spawn = SPAWNS[i % SPAWNS.length]!;
    const p = world.players[id]!;
    p.x = spawn.x;
    p.y = spawn.y;
    p.alive = true;
  });
  updateRankings(world);
  return world;
}

function walkable(world: BomberWorld, x: number, y: number): boolean {
  const cell = world.grid[y]?.[x];
  if (!cell || cell !== "empty") return false;
  if (world.bombs.some((b) => b.x === x && b.y === y)) return false;
  return true;
}

function pickupPowerUps(world: BomberWorld, p: BomberPlayer): void {
  const idx = world.powerUps.findIndex((pu) => pu.x === p.x && pu.y === p.y);
  if (idx < 0) return;
  applyPowerUp(p, world.powerUps[idx]!.kind);
  world.powerUps.splice(idx, 1);
}

export function tryMove(world: BomberWorld, playerId: string, dx: number, dy: number): void {
  const p = world.players[playerId];
  if (!p || !p.alive || world.matchOver) return;
  const steps = 1 + (p.speedBonus ?? 0);
  for (let s = 0; s < steps; s++) {
    const nx = p.x + dx;
    const ny = p.y + dy;
    if (!walkable(world, nx, ny)) break;
    p.x = nx;
    p.y = ny;
    pickupPowerUps(world, p);
  }
}

export function plantBomb(world: BomberWorld, playerId: string, now = Date.now()): void {
  const p = world.players[playerId];
  if (!p || !p.alive || p.bombsLeft <= 0 || world.matchOver) return;
  if (world.bombs.some((b) => b.x === p.x && b.y === p.y)) return;
  p.bombsLeft -= 1;
  world.bombs.push({
    id: `b${world.tick}-${playerId}`,
    ownerId: playerId,
    x: p.x,
    y: p.y,
    plantedAt: now,
    range: world.difficulty.bombRange + (p.blastBonus ?? 0),
  });
}

function blastCells(world: BomberWorld, bomb: Bomb): Array<{ x: number; y: number }> {
  const cells = [{ x: bomb.x, y: bomb.y }];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  for (const [dx, dy] of dirs) {
    for (let i = 1; i <= bomb.range; i++) {
      const x = bomb.x + dx * i;
      const y = bomb.y + dy * i;
      const cell = world.grid[y]?.[x];
      if (!cell || cell === "hard") break;
      cells.push({ x, y });
      if (cell === "soft") {
        world.grid[y]![x] = "empty";
        maybeSpawnPowerUp(world, x, y);
        break;
      }
    }
  }
  return cells;
}

function applyRoundState(world: BomberWorld, localId: string, nickname: string): void {
  const diff = getRoundDifficulty(world.round, world.aiTier ?? DEFAULT_AI_TIER);
  world.difficulty = diff;
  world.timeLimitSec = diff.timeLimitSec;
  world.fuseMs = diff.fuseMs;
  world.mapId = (world.round - 1) % MAP_PRESETS.length;
  world.grid = makeGridFromPreset(world.mapId, diff.softDensity);
  world.bombs = [];
  world.blasts = [];
  world.powerUps = [];
  world.roundOverAt = undefined;
  world.winnerId = undefined;
  world.roundStartedAt = Date.now();
  syncBotsToDifficulty(world, localId, nickname, diff);
  Object.values(world.players).forEach((p, i) => {
    const spawn = SPAWNS[i % SPAWNS.length]!;
    p.x = spawn.x;
    p.y = spawn.y;
    p.alive = true;
    resetPlayerPowerUps(p, diff);
  });
}

function startRound(world: BomberWorld): void {
  if (world.round >= world.maxRounds) {
    world.matchOver = true;
    return;
  }
  world.round += 1;
  const human = Object.values(world.players).find((p) => !p.isBot);
  applyRoundState(world, human?.id ?? "local", human?.nickname ?? "You");
}

function resolveRound(world: BomberWorld, now: number): void {
  if (world.matchOver) return;

  const elapsed = (now - world.roundStartedAt) / 1000;
  if (!world.roundOverAt && elapsed >= world.timeLimitSec) {
    // time up — living players stay; first by kills wins round, else draw
    const living = Object.values(world.players).filter((p) => p.alive);
    living.sort((a, b) => b.kills - a.kills);
    const winner = living[0] ?? null;
    world.winnerId = winner?.id ?? null;
    if (winner) winner.wins += 1;
    world.roundOverAt = now + 1800;
    updateRankings(world);
    return;
  }

  const living = Object.values(world.players).filter((p) => p.alive);
  if (living.length > 1) return;
  if (world.roundOverAt) {
    if (now >= world.roundOverAt) startRound(world);
    return;
  }
  const winner = living[0] ?? null;
  world.winnerId = winner?.id ?? null;
  if (winner) winner.wins += 1;
  world.roundOverAt = now + 2200;
  updateRankings(world);
}

function cellInBlastPreview(world: BomberWorld, x: number, y: number): boolean {
  for (const bomb of world.bombs) {
    if (bomb.x === x && bomb.y === y) return true;
    const range = bomb.range;
    if (bomb.y === y && Math.abs(bomb.x - x) <= range) {
      // same row — blocked by hard?
      const step = Math.sign(x - bomb.x) || 1;
      let blocked = false;
      for (let i = 1; i <= Math.abs(x - bomb.x); i++) {
        const cx = bomb.x + step * i;
        const cell = world.grid[y]?.[cx];
        if (!cell || cell === "hard") {
          blocked = true;
          break;
        }
        if (cell === "soft" && cx !== x) {
          blocked = true;
          break;
        }
      }
      if (!blocked) return true;
    }
    if (bomb.x === x && Math.abs(bomb.y - y) <= range) {
      const step = Math.sign(y - bomb.y) || 1;
      let blocked = false;
      for (let i = 1; i <= Math.abs(y - bomb.y); i++) {
        const cy = bomb.y + step * i;
        const cell = world.grid[cy]?.[x];
        if (!cell || cell === "hard") {
          blocked = true;
          break;
        }
        if (cell === "soft" && cy !== y) {
          blocked = true;
          break;
        }
      }
      if (!blocked) return true;
    }
  }
  return false;
}

function manhattan(a: BomberPlayer, b: BomberPlayer): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function pickChaseTarget(world: BomberWorld, bot: BomberPlayer): BomberPlayer | null {
  const others = Object.values(world.players).filter((p) => p.alive && p.id !== bot.id);
  if (others.length === 0) return null;
  const humans = others.filter((p) => !p.isBot);
  const pool = humans.length > 0 ? humans : others;
  let best = pool[0]!;
  let bestD = manhattan(bot, best);
  for (let i = 1; i < pool.length; i++) {
    const d = manhattan(bot, pool[i]!);
    if (d < bestD) {
      best = pool[i]!;
      bestD = d;
    }
  }
  return best;
}

/** True if target shares row/col within blast range and soft/hard don't fully block. */
function linedUpForBomb(world: BomberWorld, bot: BomberPlayer, target: BomberPlayer, range: number): boolean {
  if (bot.x === target.x) {
    const dist = Math.abs(bot.y - target.y);
    if (dist === 0 || dist > range) return false;
    const step = Math.sign(target.y - bot.y);
    for (let i = 1; i < dist; i++) {
      const cell = world.grid[bot.y + step * i]?.[bot.x];
      if (!cell || cell === "hard" || cell === "soft") return false;
    }
    return true;
  }
  if (bot.y === target.y) {
    const dist = Math.abs(bot.x - target.x);
    if (dist === 0 || dist > range) return false;
    const step = Math.sign(target.x - bot.x);
    for (let i = 1; i < dist; i++) {
      const cell = world.grid[bot.y]?.[bot.x + step * i];
      if (!cell || cell === "hard" || cell === "soft") return false;
    }
    return true;
  }
  return false;
}

function hasSafeBombEscape(world: BomberWorld, bot: BomberPlayer, range: number): boolean {
  const escapeDirs: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  return escapeDirs.some(([dx, dy]) => {
    let x = bot.x;
    let y = bot.y;
    for (let step = 1; step <= range + 1; step++) {
      x += dx;
      y += dy;
      if (!walkable(world, x, y)) return false;
      if (step > range) return true;
    }
    return false;
  });
}

function botThink(world: BomberWorld, bot: BomberPlayer, now: number): void {
  if (!bot.alive || world.matchOver || world.roundOverAt) return;
  const every = Math.max(2, world.difficulty.aiTickEvery);
  const chaseChance =
    world.difficulty.label === "very-hard"
      ? 0.82
      : world.difficulty.label === "hard"
        ? 0.68
        : world.difficulty.label === "easy"
          ? 0.28
          : 0.55;
  const range = world.difficulty.bombRange + (bot.blastBonus ?? 0);

  if (world.tick % every === 0) {
    const dirs: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [0, 0],
    ];
    // Prefer escaping bomb blast lanes
    if (cellInBlastPreview(world, bot.x, bot.y)) {
      let escaped = false;
      for (const [dx, dy] of dirs) {
        if (!dx && !dy) continue;
        const nx = bot.x + dx;
        const ny = bot.y + dy;
        if (walkable(world, nx, ny) && !cellInBlastPreview(world, nx, ny)) {
          tryMove(world, bot.id, dx, dy);
          escaped = true;
          break;
        }
      }
      if (escaped) return;
    }

    // Chase nearest living human (else nearest bot) when safe
    const target = pickChaseTarget(world, bot);
    let picked: [number, number] = dirs[Math.floor(Math.random() * dirs.length)]!;
    if (target && Math.random() < chaseChance) {
      const dx = Math.sign(target.x - bot.x);
      const dy = Math.sign(target.y - bot.y);
      if (dx || dy) {
        picked =
          Math.abs(target.x - bot.x) >= Math.abs(target.y - bot.y) ? [dx, 0] : [0, dy];
      }
    }
    const [dx, dy] = picked;
    if (dx || dy) {
      const nx = bot.x + dx;
      const ny = bot.y + dy;
      if (walkable(world, nx, ny) && !cellInBlastPreview(world, nx, ny)) {
        tryMove(world, bot.id, dx, dy);
      } else {
        for (const [ax, ay] of dirs) {
          if (!ax && !ay) continue;
          const tx = bot.x + ax;
          const ty = bot.y + ay;
          if (walkable(world, tx, ty) && !cellInBlastPreview(world, tx, ty)) {
            tryMove(world, bot.id, ax, ay);
            break;
          }
        }
      }
    }
  }

  if (bot.bombsLeft <= 0 || cellInBlastPreview(world, bot.x, bot.y)) return;
  if (!hasSafeBombEscape(world, bot, range)) return;

  const target = pickChaseTarget(world, bot);
  const huntChance = world.difficulty.aiHuntChance ?? 0.35;
  const wantHunt =
    target && linedUpForBomb(world, bot, target, range) && Math.random() < huntChance;
  const wantWander = Math.random() < world.difficulty.aiBombChance;
  if (wantHunt || wantWander) {
    plantBomb(world, bot.id, now);
  }
}

export function remainingTimeSec(world: BomberWorld, now = Date.now()): number {
  const left = world.timeLimitSec - (now - world.roundStartedAt) / 1000;
  return Math.max(0, Math.ceil(left));
}

export function tickBomberWorld(world: BomberWorld, now = Date.now()): void {
  if (world.matchOver) return;
  world.tick += 1;
  for (const p of Object.values(world.players)) {
    if (p.isBot) botThink(world, p, now);
  }

  const fuse = world.fuseMs || BOMBER_BOMB_FUSE_MS;
  const remain: Bomb[] = [];
  for (const bomb of world.bombs) {
    if (now - bomb.plantedAt < fuse) {
      remain.push(bomb);
      continue;
    }
    const cells = blastCells(world, bomb);
    world.blasts.push({ id: `blast-${bomb.id}`, cells, until: now + BOMBER_BLAST_MS });
    const owner = world.players[bomb.ownerId];
    if (owner) owner.bombsLeft = Math.min(owner.bombsMax, owner.bombsLeft + 1);
    for (const p of Object.values(world.players)) {
      if (!p.alive) continue;
      if (cells.some((c) => c.x === p.x && c.y === p.y)) {
        p.alive = false;
        if (owner && owner.id !== p.id) owner.kills += 1;
      }
    }
  }
  world.bombs = remain;
  world.blasts = world.blasts.filter((b) => b.until > now);
  resolveRound(world, now);
  updateRankings(world);
}
