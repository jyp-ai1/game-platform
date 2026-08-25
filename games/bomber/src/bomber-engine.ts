/** Bomber MVP — 2–8p grid, bomb, blast, death, round, TOP LB.
 * STEP 4 — round difficulty ladder + 4 preset maps (no procedural gen).
 */

export const BOMBER_COLS = 13;
export const BOMBER_ROWS = 11;
export const BOMBER_TICK_MS = 50;
export const BOMBER_MIN_PLAYERS = 2;
export const BOMBER_MAX_PLAYERS = 8;
export const BOMBER_BOMB_FUSE_MS = 1800;
export const BOMBER_BLAST_MS = 350;
export const BOMBER_RANGE = 2;
export const BOMBER_MAX_ROUNDS = 4;

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
  softDensity: number;
  timeLimitSec: number;
  bombRange: number;
  bombsMax: number;
  fuseMs: number;
};

/** Round 1 easy → 4 very hard. Start gentle so CEO can reach Round 2+. */
export const ROUND_DIFFICULTY: RoundDifficulty[] = [
  {
    label: "easy",
    botCount: 2,
    aiTickEvery: 14,
    aiBombChance: 0.018,
    softDensity: 0.42,
    timeLimitSec: 90,
    bombRange: 2,
    bombsMax: 1,
    fuseMs: 2000,
  },
  {
    label: "normal",
    botCount: 3,
    aiTickEvery: 9,
    aiBombChance: 0.04,
    softDensity: 0.55,
    timeLimitSec: 75,
    bombRange: 2,
    bombsMax: 1,
    fuseMs: 1800,
  },
  {
    label: "hard",
    botCount: 4,
    aiTickEvery: 6,
    aiBombChance: 0.07,
    softDensity: 0.65,
    timeLimitSec: 55,
    bombRange: 3,
    bombsMax: 2,
    fuseMs: 1600,
  },
  {
    label: "very-hard",
    botCount: 5,
    aiTickEvery: 4,
    aiBombChance: 0.1,
    softDensity: 0.72,
    timeLimitSec: 40,
    bombRange: 3,
    bombsMax: 2,
    fuseMs: 1400,
  },
];

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
};

const COLORS = ["#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#a78bfa", "#fb7185", "#60a5fa", "#4ade80"];

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

export function getRoundDifficulty(round: number): RoundDifficulty {
  const idx = Math.max(0, Math.min(ROUND_DIFFICULTY.length - 1, round - 1));
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
    p.bombsMax = diff.bombsMax;
    p.bombsLeft = diff.bombsMax;
  }
}

export function createBomberWorld(localId: string, nickname: string, _botCount = 2): BomberWorld {
  const round = 1;
  const diff = getRoundDifficulty(round);
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

export function tryMove(world: BomberWorld, playerId: string, dx: number, dy: number): void {
  const p = world.players[playerId];
  if (!p || !p.alive || world.matchOver) return;
  const nx = p.x + dx;
  const ny = p.y + dy;
  if (!walkable(world, nx, ny)) return;
  p.x = nx;
  p.y = ny;
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
    range: world.difficulty.bombRange,
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
        break;
      }
    }
  }
  return cells;
}

function applyRoundState(world: BomberWorld, localId: string, nickname: string): void {
  const diff = getRoundDifficulty(world.round);
  world.difficulty = diff;
  world.timeLimitSec = diff.timeLimitSec;
  world.fuseMs = diff.fuseMs;
  world.mapId = (world.round - 1) % MAP_PRESETS.length;
  world.grid = makeGridFromPreset(world.mapId, diff.softDensity);
  world.bombs = [];
  world.blasts = [];
  world.roundOverAt = undefined;
  world.winnerId = undefined;
  world.roundStartedAt = Date.now();
  syncBotsToDifficulty(world, localId, nickname, diff);
  Object.values(world.players).forEach((p, i) => {
    const spawn = SPAWNS[i % SPAWNS.length]!;
    p.x = spawn.x;
    p.y = spawn.y;
    p.alive = true;
    p.bombsMax = diff.bombsMax;
    p.bombsLeft = diff.bombsMax;
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

function botThink(world: BomberWorld, bot: BomberPlayer, now: number): void {
  if (!bot.alive || world.matchOver || world.roundOverAt) return;
  const every = Math.max(2, world.difficulty.aiTickEvery);
  if (world.tick % every === 0) {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [0, 0],
    ];
    // lightly prefer moving toward nearest living human when judgment is high
    const judgment = 1 / every;
    let picked = dirs[Math.floor(Math.random() * dirs.length)]!;
    if (judgment > 0.12 && Math.random() < judgment) {
      const humans = Object.values(world.players).filter((p) => !p.isBot && p.alive);
      const target = humans[0];
      if (target) {
        const dx = Math.sign(target.x - bot.x);
        const dy = Math.sign(target.y - bot.y);
        if (dx || dy) picked = Math.abs(target.x - bot.x) >= Math.abs(target.y - bot.y) ? [dx, 0] : [0, dy];
      }
    }
    const dx = picked[0] ?? 0;
    const dy = picked[1] ?? 0;
    if (dx || dy) tryMove(world, bot.id, dx, dy);
  }
  if (bot.bombsLeft > 0 && Math.random() < world.difficulty.aiBombChance) {
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
