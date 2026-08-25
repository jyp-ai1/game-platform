/** Bomber MVP — 2–8p grid, bomb, blast, death, round, TOP LB. */

export const BOMBER_COLS = 13;
export const BOMBER_ROWS = 11;
export const BOMBER_TICK_MS = 50;
export const BOMBER_MIN_PLAYERS = 2;
export const BOMBER_MAX_PLAYERS = 8;
export const BOMBER_BOMB_FUSE_MS = 1800;
export const BOMBER_BLAST_MS = 350;
export const BOMBER_RANGE = 2;

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

export type BomberWorld = {
  tick: number;
  round: number;
  cols: number;
  rows: number;
  grid: Cell[][];
  players: Record<string, BomberPlayer>;
  bombs: Bomb[];
  blasts: Blast[];
  rankings: Array<{ id: string; nickname: string; wins: number; kills: number; color: string }>;
  roundOverAt?: number;
  winnerId?: string | null;
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

function makeGrid(): Cell[][] {
  const g: Cell[][] = [];
  for (let y = 0; y < BOMBER_ROWS; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < BOMBER_COLS; x++) {
      if (x === 0 || y === 0 || x === BOMBER_COLS - 1 || y === BOMBER_ROWS - 1) row.push("hard");
      else if (x % 2 === 0 && y % 2 === 0) row.push("hard");
      else {
        const edge = (x <= 2 && y <= 2) || (x >= BOMBER_COLS - 3 && y <= 2) || (x <= 2 && y >= BOMBER_ROWS - 3) || (x >= BOMBER_COLS - 3 && y >= BOMBER_ROWS - 3);
        row.push(edge ? "empty" : Math.random() < 0.62 ? "soft" : "empty");
      }
    }
    g.push(row);
  }
  return g;
}

function updateRankings(world: BomberWorld): void {
  world.rankings = Object.values(world.players)
    .map((p) => ({ id: p.id, nickname: p.nickname, wins: p.wins, kills: p.kills, color: p.color }))
    .sort((a, b) => b.wins - a.wins || b.kills - a.kills)
    .slice(0, 8);
}

export function createBomberWorld(localId: string, nickname: string, botCount = 3): BomberWorld {
  const n = Math.max(BOMBER_MIN_PLAYERS - 1, Math.min(BOMBER_MAX_PLAYERS - 1, botCount));
  const world: BomberWorld = {
    tick: 0,
    round: 1,
    cols: BOMBER_COLS,
    rows: BOMBER_ROWS,
    grid: makeGrid(),
    players: {},
    bombs: [],
    blasts: [],
    rankings: [],
  };
  const ids = [localId, ...Array.from({ length: n }, (_, i) => `bot:${i}`)];
  ids.forEach((id, i) => {
    const spawn = SPAWNS[i % SPAWNS.length]!;
    world.players[id] = {
      id,
      nickname: id === localId ? nickname || "You" : `Bomber${i}`,
      color: COLORS[i % COLORS.length]!,
      x: spawn.x,
      y: spawn.y,
      alive: true,
      isBot: id !== localId,
      bombsMax: 1,
      bombsLeft: 1,
      kills: 0,
      wins: 0,
    };
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
  if (!p || !p.alive) return;
  const nx = p.x + dx;
  const ny = p.y + dy;
  if (!walkable(world, nx, ny)) return;
  p.x = nx;
  p.y = ny;
}

export function plantBomb(world: BomberWorld, playerId: string, now = Date.now()): void {
  const p = world.players[playerId];
  if (!p || !p.alive || p.bombsLeft <= 0) return;
  if (world.bombs.some((b) => b.x === p.x && b.y === p.y)) return;
  p.bombsLeft -= 1;
  world.bombs.push({
    id: `b${world.tick}-${playerId}`,
    ownerId: playerId,
    x: p.x,
    y: p.y,
    plantedAt: now,
    range: BOMBER_RANGE,
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

function startRound(world: BomberWorld): void {
  world.round += 1;
  world.grid = makeGrid();
  world.bombs = [];
  world.blasts = [];
  world.roundOverAt = undefined;
  world.winnerId = undefined;
  Object.values(world.players).forEach((p, i) => {
    const spawn = SPAWNS[i % SPAWNS.length]!;
    p.x = spawn.x;
    p.y = spawn.y;
    p.alive = true;
    p.bombsLeft = p.bombsMax;
  });
}

function resolveRound(world: BomberWorld, now: number): void {
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
  if (!bot.alive) return;
  if (world.tick % 8 === 0) {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [0, 0],
    ];
    const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)]!;
    if (dx || dy) tryMove(world, bot.id, dx, dy);
  }
  if (bot.bombsLeft > 0 && Math.random() < 0.04) plantBomb(world, bot.id, now);
}

export function tickBomberWorld(world: BomberWorld, now = Date.now()): void {
  world.tick += 1;
  for (const p of Object.values(world.players)) {
    if (p.isBot) botThink(world, p, now);
  }

  const remain: Bomb[] = [];
  for (const bomb of world.bombs) {
    if (now - bomb.plantedAt < BOMBER_BOMB_FUSE_MS) {
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
