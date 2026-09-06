/** BOMBER-ONLINE-002 — Classic multiplayer match (4/6 · maps · fire=1 · 3 items · sudden death). */

export const BOMBER_COLS = 15;
export const BOMBER_ROWS = 13;
export const BOMBER_TICK_MS = 50;
export const BOMBER_BOMB_FUSE_MS = 1800;
export const BOMBER_BLAST_MS = 420;
/** GAME-DEV-003 — solo gameplay score ticks (no new ranking system). */
export const BOMBER_SCORE_BLOCK = 5;
export const BOMBER_SCORE_COIN = 10;
export const BOMBER_SCORE_KILL = 25;
/** GAME-DEV-011 — bonus per chain link (x2 → +8, x3 → +16, …). */
export const BOMBER_CHAIN_BONUS = 8;
export const BOMBER_SCORE_RISK = 20;
/** Chance a destroyed soft block drops a coin pickup. */
export const BOMBER_COIN_DROP_CHANCE = 0.22;
/** Fuse fraction elapsed before danger zone is shown. */
export const BOMBER_DANGER_FUSE_RATIO = 0.45;

/** Fire power starts at 1; map caps max fire. */
export const BOMBER_FIRE_START = 1;
export const BOMBER_SUDDEN_DEATH_AT_SEC = 105;
export const BOMBER_SUDDEN_DEATH_INTERVAL_SEC = 8;

export type Cell = "empty" | "soft" | "hard";
export type PlayerSlots = 4 | 6;
export type PowerUpKind = "bomb" | "speed" | "range" | "risk";

/** GAME-DEV-003 — single reward pickup (coin). */
export type BomberCoin = {
  id: string;
  x: number;
  y: number;
};

export type BomberFeedbackKind = "plant" | "block" | "coin" | "kill" | "blast" | "chain" | "item";

export type BomberFeedback = {
  kind: BomberFeedbackKind;
  amount: number;
  x: number;
  y: number;
};

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
  /** GAME-DEV-003 — session score (HUD feedback). */
  score?: number;
  blastBonus?: number;
  speedBonus?: number;
  /** Placement when eliminated (1 = winner). */
  place?: number;
  /** One-shot UI feedback from last tick. */
  feedback?: BomberFeedback;
  /** GAME-DEV-011 — bot behavior archetype */
  botRole?: "chaser" | "patrol" | "evader" | "rusher";
  /** GAME-DEV-011 — ticks alive (for rusher pattern) */
  aliveSinceTick?: number;
  /** GAME-DEV-011 — temporary speed penalty from risk pickup */
  speedPenalty?: number;
};

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

export type Placement = {
  id: string;
  nickname: string;
  place: number;
  kills: number;
  color: string;
  alive: boolean;
};

/** Classic match AI — harder than FUN-001 Normal, not unbeatable. */
export type MatchDifficulty = {
  aiTickEvery: number;
  aiBombChance: number;
  aiHuntChance: number;
  softDensity: number;
  fuseMs: number;
  powerUpChance: number;
  bombRange: number;
  bombsMax: number;
  maxFire: number;
};

export const MATCH_AI: MatchDifficulty = {
  // Harder than old Normal (tick 8 / bomb 0.032); not godlike
  aiTickEvery: 3,
  aiBombChance: 0.08,
  aiHuntChance: 0.62,
  softDensity: 0.58,
  fuseMs: BOMBER_BOMB_FUSE_MS,
  powerUpChance: 0.28,
  bombRange: BOMBER_FIRE_START,
  bombsMax: 1,
  maxFire: 4,
};

/** Map A/B/C/D — Classic · Cross · Maze · Open */
export const MAP_NAMES = ["Classic", "Cross", "Maze", "Open"] as const;
export const MAP_LETTERS = ["A", "B", "C", "D"] as const;

/** Roster size is determined by map (no 4/6 picker). Classic/Cross=4, Maze/Open=6 */
export const MAP_ROSTER: readonly PlayerSlots[] = [4, 4, 6, 6];

/** Same Map = same Room/World shard */
export function bomberRoomCodeForMap(mapId: number): string {
  const letter = MAP_LETTERS[((mapId % 4) + 4) % 4] ?? "A";
  return `BOMBER-${letter}`;
}

export function rosterForMap(mapId: number): PlayerSlots {
  return MAP_ROSTER[((mapId % 4) + 4) % 4] ?? 4;
}

/** Per-map max fire power (cap after Fire+1 pickups). */
export const MAP_MAX_FIRE: readonly number[] = [4, 5, 3, 6];

export type BomberWorld = {
  tick: number;
  mapId: number;
  playerSlots: PlayerSlots;
  cols: number;
  rows: number;
  grid: Cell[][];
  players: Record<string, BomberPlayer>;
  bombs: Bomb[];
  blasts: Blast[];
  rankings: Array<{ id: string; nickname: string; wins: number; kills: number; color: string }>;
  placements: Placement[];
  /** Elimination order (first death first); used for placement. */
  deathOrder: string[];
  matchOver?: boolean;
  winnerId?: string | null;
  isDraw?: boolean;
  matchStartedAt: number;
  fuseMs: number;
  difficulty: MatchDifficulty;
  powerUps: PowerUp[];
  /** GAME-DEV-003 — coin pickups from destroyed blocks. */
  coins: BomberCoin[];
  suddenDeathActive: boolean;
  suddenDeathRing: number;
  maxFire: number;
};

const POWERUP_EMOJI: Record<PowerUpKind, string> = {
  bomb: "💣",
  speed: "⚡",
  range: "🔥",
  risk: "☠️",
};

const BOT_ROLES = ["chaser", "patrol", "evader", "rusher"] as const;

function assignBotRole(idx: number): BomberPlayer["botRole"] {
  return BOT_ROLES[idx % BOT_ROLES.length]!;
}

const COLORS = ["#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#a78bfa", "#fb7185", "#60a5fa", "#4ade80"];

/** Deterministic soft→item spawn (no Math.random — keeps clients aligned). */
function maybeSpawnPowerUp(world: BomberWorld, x: number, y: number): void {
  const chance = world.difficulty.powerUpChance ?? 0.28;
  const roll = ((x * 31 + y * 17 + world.tick * 13) % 100) / 100;
  if (roll > chance) return;
  if (world.powerUps.some((p) => p.x === x && p.y === y)) return;
  const kinds: PowerUpKind[] = ["bomb", "speed", "range"];
  const riskRoll = ((x * 13 + y * 7 + world.tick) % 100) / 100;
  const kind: PowerUpKind = riskRoll < 0.08 ? "risk" : kinds[(x + y + world.tick) % kinds.length]!;
  world.powerUps.push({ id: `pu-${world.tick}-${x}-${y}`, kind, x, y });
}

export function applyPowerUp(p: BomberPlayer, kind: PowerUpKind, maxFire: number): void {
  if (kind === "bomb") {
    p.bombsMax = Math.min(5, p.bombsMax + 1);
    p.bombsLeft = Math.min(p.bombsMax, p.bombsLeft + 1);
  } else if (kind === "speed") {
    p.speedBonus = Math.min(2, (p.speedBonus ?? 0) + 1);
  } else if (kind === "range") {
    const next = Math.min(maxFire - BOMBER_FIRE_START, (p.blastBonus ?? 0) + 1);
    p.blastBonus = Math.max(0, next);
  } else if (kind === "risk") {
    p.score = (p.score ?? 0) + BOMBER_SCORE_RISK;
    p.speedPenalty = Math.min(2, (p.speedPenalty ?? 0) + 1);
  }
}

function resetPlayerLoadout(p: BomberPlayer, diff: MatchDifficulty): void {
  p.blastBonus = 0;
  p.speedBonus = 0;
  p.bombsMax = diff.bombsMax;
  p.bombsLeft = diff.bombsMax;
  p.score = 0;
}

export function powerUpEmoji(kind: PowerUpKind): string {
  return POWERUP_EMOJI[kind];
}

/** Spawns with safe 2-tile clearance for 4 and 6. */
function spawnPoints(slots: PlayerSlots): Array<{ x: number; y: number }> {
  const c = BOMBER_COLS;
  const r = BOMBER_ROWS;
  const corners = [
    { x: 1, y: 1 },
    { x: c - 2, y: 1 },
    { x: 1, y: r - 2 },
    { x: c - 2, y: r - 2 },
  ];
  if (slots === 4) return corners;
  return [
    ...corners,
    { x: 1, y: Math.floor(r / 2) },
    { x: c - 2, y: Math.floor(r / 2) },
  ];
}

/**
 * Soft-wall masks (1=soft) for interior coords; borders + even×even pillars are hard.
 * Sized for 15×13 (indices 0..14 × 0..12).
 */
const MAP_PRESETS: number[][][] = [
  // A Classic — symmetric corridors
  [
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  ],
  // B Cross
  [
    [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0],
    [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
    [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
    [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
    [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
    [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
    [0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0],
  ],
  // C Maze
  [
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
    [1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  ],
  // D Open / Arena
  [
    [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
  ],
];

function clearSpawnSafeZones(g: Cell[][], slots: PlayerSlots): void {
  const clear = (cx: number, cy: number) => {
    for (let dy = 0; dy <= 2; dy++) {
      for (let dx = 0; dx <= 2; dx++) {
        const x = cx + (cx < BOMBER_COLS / 2 ? dx : -dx);
        const y = cy + (cy < BOMBER_ROWS / 2 ? dy : -dy);
        if (g[y]?.[x] === "soft") g[y]![x] = "empty";
      }
    }
  };
  for (const s of spawnPoints(slots)) clear(s.x, s.y);
}

function makeGridFromPreset(mapId: number, softDensity: number, slots: PlayerSlots): Cell[][] {
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
      const keep =
        softDensity >= 0.7 ? true : softDensity >= 0.55 ? (x + y) % 3 !== 0 : (x + y) % 2 === 0;
      row.push(keep ? "soft" : "empty");
    }
    g.push(row);
  }
  clearSpawnSafeZones(g, slots);
  return g;
}

function updateRankings(world: BomberWorld): void {
  world.rankings = Object.values(world.players)
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      wins: p.wins,
      kills: p.kills,
      color: p.color,
    }))
    .sort((a, b) => {
      const pa = world.players[a.id]?.place ?? 99;
      const pb = world.players[b.id]?.place ?? 99;
      if (pa !== pb) return pa - pb;
      return b.kills - a.kills;
    })
    .slice(0, 8);

  world.placements = Object.values(world.players)
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      place: p.place ?? (p.alive ? 1 : 99),
      kills: p.kills,
      color: p.color,
      alive: p.alive,
    }))
    .sort((a, b) => a.place - b.place || b.kills - a.kills);
}

export type HumanSeat = { id: string; nickname: string; color?: string };

function fillPlayers(
  world: BomberWorld,
  humans: HumanSeat[],
  diff: MatchDifficulty
): void {
  const seats = spawnPoints(world.playerSlots);
  const want = world.playerSlots;
  const list: HumanSeat[] = humans.slice(0, want);
  while (list.length < want) {
    const idx = list.length;
    list.push({ id: `bot:${idx}`, nickname: `Bomber${idx + 1}` });
  }

  world.players = {};
  list.forEach((h, i) => {
    const spawn = seats[i % seats.length]!;
    const isBot = h.id.startsWith("bot:");
    world.players[h.id] = {
      id: h.id,
      nickname: h.nickname || (isBot ? `Bomber${i + 1}` : "You"),
      color: h.color || COLORS[i % COLORS.length]!,
      x: spawn.x,
      y: spawn.y,
      alive: true,
      isBot,
      bombsMax: diff.bombsMax,
      bombsLeft: diff.bombsMax,
      kills: 0,
      wins: 0,
      score: 0,
      blastBonus: 0,
      speedBonus: 0,
      ...(isBot ? { botRole: assignBotRole(i), aliveSinceTick: 0 } : {}),
    };
  });
}

export function createBomberWorld(
  localId: string,
  nickname: string,
  opts?: {
    playerSlots?: PlayerSlots;
    mapId?: number;
    humans?: HumanSeat[];
    matchStartedAt?: number;
  }
): BomberWorld {
  const mapId = Math.max(0, Math.min(3, opts?.mapId ?? 0));
  const playerSlots: PlayerSlots =
    opts?.playerSlots === 4 || opts?.playerSlots === 6
      ? opts.playerSlots
      : rosterForMap(mapId);
  const maxFire = MAP_MAX_FIRE[mapId] ?? 4;
  const diff: MatchDifficulty = { ...MATCH_AI, bombRange: BOMBER_FIRE_START, maxFire };
  const humans =
    opts?.humans && opts.humans.length > 0
      ? opts.humans
      : [{ id: localId, nickname: nickname || "You" }];

  const world: BomberWorld = {
    tick: 0,
    mapId,
    playerSlots,
    cols: BOMBER_COLS,
    rows: BOMBER_ROWS,
    grid: makeGridFromPreset(mapId, diff.softDensity, playerSlots),
    players: {},
    bombs: [],
    blasts: [],
    rankings: [],
    placements: [],
    deathOrder: [],
    matchStartedAt: opts?.matchStartedAt ?? Date.now(),
    fuseMs: diff.fuseMs,
    difficulty: diff,
    powerUps: [],
    coins: [],
    suddenDeathActive: false,
    suddenDeathRing: 0,
    maxFire,
  };
  fillPlayers(world, humans, diff);
  if (!world.players[localId]) {
    // Ensure local always present (replace last bot if needed)
    const bots = Object.values(world.players).filter((p) => p.isBot);
    const drop = bots[bots.length - 1];
    if (drop) delete world.players[drop.id];
    const seats = spawnPoints(playerSlots);
    const idx = Object.keys(world.players).length;
    world.players[localId] = {
      id: localId,
      nickname: nickname || "You",
      color: COLORS[idx % COLORS.length]!,
      x: seats[idx % seats.length]!.x,
      y: seats[idx % seats.length]!.y,
      alive: true,
      isBot: false,
      bombsMax: diff.bombsMax,
      bombsLeft: diff.bombsMax,
      kills: 0,
      wins: 0,
      score: 0,
      blastBonus: 0,
      speedBonus: 0,
    };
  }
  updateRankings(world);
  return world;
}

export type ReconcileHumansOpts = {
  /** Sim host — never demoted; pinned to seat 0; restored if missing. */
  hostId?: string;
};

/**
 * Host seat 0, guests seat 1+; leavers → AI refill.
 */
export function reconcileHumans(
  world: BomberWorld,
  humans: HumanSeat[],
  opts?: ReconcileHumansOpts
): void {
  if (world.matchOver) return;
  const want = world.playerSlots;
  const hostId = opts?.hostId;
  let ordered = [...humans];
  if (hostId) {
    ordered = [
      ...ordered.filter((h) => h.id === hostId),
      ...ordered.filter((h) => h.id !== hostId),
    ];
  }
  const humanIds = new Set(ordered.map((h) => h.id));
  if (hostId) humanIds.add(hostId);
  const seats = spawnPoints(want);

  for (let seatIdx = 0; seatIdx < ordered.length; seatIdx++) {
    const h = ordered[seatIdx]!;
    const existing = world.players[h.id];
    if (existing) {
      existing.isBot = false;
      existing.nickname = h.nickname || existing.nickname;
      if (h.color) existing.color = h.color;
      continue;
    }
    const target = seats[seatIdx % seats.length]!;
    const botAtSeat = Object.values(world.players).find(
      (p) => p.isBot && p.x === target.x && p.y === target.y
    );
    const bot = botAtSeat ?? Object.values(world.players).find((p) => p.isBot);
    if (!bot) break;
    const seat = { ...bot };
    delete world.players[bot.id];
    world.players[h.id] = {
      ...seat,
      id: h.id,
      nickname: h.nickname || "Player",
      color: h.color || seat.color,
      isBot: false,
      alive: true,
      bombsLeft: seat.bombsMax ?? world.difficulty.bombsMax,
    };
  }

  for (const p of Object.values(world.players)) {
    if (p.isBot) continue;
    if (humanIds.has(p.id)) continue;
    if (hostId && p.id === hostId) continue;
    const botId = `bot:refill-${p.x}-${p.y}-${world.tick}`;
    const seat = { ...p };
    delete world.players[p.id];
    world.players[botId] = {
      ...seat,
      id: botId,
      nickname: `Bomber${Object.keys(world.players).length + 1}`,
      isBot: true,
    };
  }

  if (hostId && !world.players[hostId]) {
    const target = seats[0]!;
    const botAtSeat = Object.values(world.players).find(
      (p) => p.isBot && p.x === target.x && p.y === target.y
    );
    const bot = botAtSeat ?? Object.values(world.players).find((p) => p.isBot);
    if (bot) {
      const seat = { ...bot };
      delete world.players[bot.id];
      const meta = ordered.find((h) => h.id === hostId);
      world.players[hostId] = {
        ...seat,
        id: hostId,
        nickname: meta?.nickname || "Host",
        color: meta?.color || seat.color,
        isBot: false,
        alive: true,
        bombsLeft: seat.bombsMax ?? world.difficulty.bombsMax,
      };
    }
  }

  // Distinct seats: reposition only when two humans share a tile (never every tick).
  for (let i = 0; i < ordered.length; i++) {
    const h = ordered[i]!;
    const p = world.players[h.id];
    if (!p || p.isBot) continue;
    const target = seats[i % seats.length]!;
    const overlap = ordered.some((other, j) => {
      if (j === i || other.id === h.id) return false;
      const op = world.players[other.id];
      return op && !op.isBot && op.x === p.x && op.y === p.y;
    });
    if (overlap) {
      p.x = target.x;
      p.y = target.y;
    }
  }

  while (Object.keys(world.players).length < want) {
    const seats = spawnPoints(want);
    const taken = new Set(
      Object.values(world.players).map((p) => `${p.x},${p.y}`)
    );
    const spawn = seats.find((s) => !taken.has(`${s.x},${s.y}`)) ?? seats[0]!;
    const idx = Object.keys(world.players).length;
    const id = `bot:${idx}-${world.tick}`;
    world.players[id] = {
      id,
      nickname: `Bomber${idx + 1}`,
      color: COLORS[idx % COLORS.length]!,
      x: spawn.x,
      y: spawn.y,
      alive: true,
      isBot: true,
      bombsMax: world.difficulty.bombsMax,
      bombsLeft: world.difficulty.bombsMax,
      kills: 0,
      wins: 0,
      score: 0,
      blastBonus: 0,
      speedBonus: 0,
      botRole: assignBotRole(idx),
      aliveSinceTick: world.tick,
    };
  }

  while (Object.keys(world.players).length > want) {
    const bot = Object.values(world.players).find((p) => p.isBot);
    if (!bot) break;
    delete world.players[bot.id];
  }

  updateRankings(world);
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
  const kind = world.powerUps[idx]!.kind;
  applyPowerUp(p, kind, world.maxFire);
  world.powerUps.splice(idx, 1);
  p.feedback = { kind: "item", amount: 0, x: p.x, y: p.y };
}

export function tryMove(world: BomberWorld, playerId: string, dx: number, dy: number): void {
  const p = world.players[playerId];
  if (!p || !p.alive || world.matchOver) return;
  const nx = p.x + dx;
  const ny = p.y + dy;
  if (!walkable(world, nx, ny)) return;
  p.x = nx;
  p.y = ny;
  pickupPowerUps(world, p);
  pickupCoins(world, p);
}

/** Mobile pad repeat interval — speed ⚡ reduces cadence; risk ☠️ slows it. */
export function bomberPadRepeatMs(speedBonus = 0, speedPenalty = 0): number {
  const net = Math.max(0, (speedBonus ?? 0) - (speedPenalty ?? 0));
  return Math.max(50, 100 - net * 25);
}

export function plantBomb(world: BomberWorld, playerId: string, now = Date.now()): Bomb | null {
  const p = world.players[playerId];
  if (!p || !p.alive || p.bombsLeft <= 0 || world.matchOver) return null;
  if (world.bombs.some((b) => b.x === p.x && b.y === p.y)) return null;
  p.bombsLeft -= 1;
  const range = Math.min(
    world.maxFire,
    BOMBER_FIRE_START + (p.blastBonus ?? 0)
  );
  const bomb: Bomb = {
    id: `b${world.tick}-${playerId}-${now}`,
    ownerId: playerId,
    x: p.x,
    y: p.y,
    plantedAt: now,
    range,
  };
  world.bombs.push(bomb);
  p.feedback = { kind: "plant", amount: 0, x: p.x, y: p.y };
  return bomb;
}

function blastCells(
  world: BomberWorld,
  bomb: Bomb,
  owner?: BomberPlayer
): Array<{ x: number; y: number }> {
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
        maybeDropCoin(world, x, y);
        if (owner) {
          owner.score = (owner.score ?? 0) + BOMBER_SCORE_BLOCK;
          owner.feedback = { kind: "block", amount: BOMBER_SCORE_BLOCK, x, y };
        }
        break;
      }
    }
  }
  return cells;
}

function markDeath(world: BomberWorld, p: BomberPlayer): void {
  if (!p.alive) return;
  p.alive = false;
  if (!world.deathOrder.includes(p.id)) world.deathOrder.push(p.id);
}

function finalizeMatch(world: BomberWorld): void {
  const living = Object.values(world.players).filter((p) => p.alive);
  const total = Object.keys(world.players).length;

  if (living.length === 1) {
    const winner = living[0]!;
    winner.wins += 1;
    winner.place = 1;
    world.winnerId = winner.id;
    world.isDraw = false;
  } else if (living.length === 0) {
    world.winnerId = null;
    world.isDraw = true;
  } else {
    return;
  }

  // Assign places: winner=1, then reverse death order
  let place = living.length === 1 ? 2 : 1;
  for (let i = world.deathOrder.length - 1; i >= 0; i--) {
    const id = world.deathOrder[i]!;
    const p = world.players[id];
    if (!p || p.place) continue;
    p.place = place;
    place += 1;
  }
  for (const p of Object.values(world.players)) {
    if (!p.place) p.place = total;
  }

  world.matchOver = true;
  updateRankings(world);
}

/** Shrink playable area from edges — converts soft/empty to hard; players on ring die. */
function applySuddenDeath(world: BomberWorld, now: number): void {
  const elapsed = (now - world.matchStartedAt) / 1000;
  if (elapsed < BOMBER_SUDDEN_DEATH_AT_SEC) return;

  world.suddenDeathActive = true;
  const ringsWanted =
    1 + Math.floor((elapsed - BOMBER_SUDDEN_DEATH_AT_SEC) / BOMBER_SUDDEN_DEATH_INTERVAL_SEC);
  const maxRing = Math.min(
    ringsWanted,
    Math.floor(Math.min(BOMBER_COLS, BOMBER_ROWS) / 2) - 2
  );

  while (world.suddenDeathRing < maxRing) {
    world.suddenDeathRing += 1;
    const ring = world.suddenDeathRing;
    for (let y = 0; y < BOMBER_ROWS; y++) {
      for (let x = 0; x < BOMBER_COLS; x++) {
        const onRing =
          x === ring ||
          y === ring ||
          x === BOMBER_COLS - 1 - ring ||
          y === BOMBER_ROWS - 1 - ring;
        if (!onRing) continue;
        if (world.grid[y]![x] !== "hard") {
          world.grid[y]![x] = "hard";
        }
        for (const p of Object.values(world.players)) {
          if (p.alive && p.x === x && p.y === y) markDeath(world, p);
        }
      }
    }
  }
}

function pickupCoins(world: BomberWorld, p: BomberPlayer): void {
  const idx = world.coins.findIndex((c) => c.x === p.x && c.y === p.y);
  if (idx < 0) return;
  world.coins.splice(idx, 1);
  p.score = (p.score ?? 0) + BOMBER_SCORE_COIN;
  p.feedback = { kind: "coin", amount: BOMBER_SCORE_COIN, x: p.x, y: p.y };
}

function maybeDropCoin(world: BomberWorld, x: number, y: number): void {
  const roll = ((x * 31 + y * 17 + world.tick * 13) % 100) / 100;
  if (roll > BOMBER_COIN_DROP_CHANCE) return;
  if (world.coins.some((c) => c.x === x && c.y === y)) return;
  world.coins.push({ id: `coin-${world.tick}-${x}-${y}`, x, y });
}

/** Read-only blast ray — no grid mutation (danger preview). */
function previewBlastCells(world: BomberWorld, bomb: Bomb): Array<{ x: number; y: number }> {
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
      if (cell === "soft") break;
    }
  }
  return cells;
}

/** GAME-DEV-011 — cells in imminent blast range (fuse past danger threshold + chain preview). */
export function getBombDangerCells(world: BomberWorld, now = Date.now()): Array<{ x: number; y: number }> {
  const fuse = world.fuseMs || BOMBER_BOMB_FUSE_MS;
  const out: Array<{ x: number; y: number }> = [];
  const seen = new Set<string>();
  const queue: Bomb[] = [];
  const queued = new Set<string>();

  for (const bomb of world.bombs) {
    const elapsed = now - bomb.plantedAt;
    if (elapsed < fuse * BOMBER_DANGER_FUSE_RATIO) continue;
    queue.push(bomb);
    queued.add(bomb.id);
  }

  while (queue.length > 0) {
    const bomb = queue.shift()!;
    for (const c of previewBlastCells(world, bomb)) {
      const key = `${c.x},${c.y}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(c);
      }
      for (const other of world.bombs) {
        if (other.id === bomb.id || queued.has(other.id)) continue;
        if (other.x === c.x && other.y === c.y) {
          queue.push(other);
          queued.add(other.id);
        }
      }
    }
  }
  return out;
}

export function isCellInBlastDanger(world: BomberWorld, x: number, y: number): boolean {
  return cellInBlastPreview(world, x, y);
}

function cellInBlastPreview(world: BomberWorld, x: number, y: number): boolean {
  for (const bomb of world.bombs) {
    if (bomb.x === x && bomb.y === y) return true;
    const range = bomb.range;
    if (bomb.y === y && Math.abs(bomb.x - x) <= range) {
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

function linedUpForBomb(
  world: BomberWorld,
  bot: BomberPlayer,
  target: BomberPlayer,
  range: number
): boolean {
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
  if (!bot.alive || world.matchOver) return;
  const every = Math.max(2, world.difficulty.aiTickEvery);
  const role = bot.botRole ?? "patrol";
  let chaseChance = 0.62;
  let bombChance = world.difficulty.aiBombChance;
  if (role === "chaser") chaseChance = 0.88;
  else if (role === "patrol") chaseChance = 0.35;
  else if (role === "evader") {
    chaseChance = 0.42;
    bombChance *= 0.55;
  } else if (role === "rusher") {
    const aliveTicks = world.tick - (bot.aliveSinceTick ?? world.tick);
    if (aliveTicks > 600) {
      chaseChance = 0.92;
      bombChance *= 1.75;
    } else {
      chaseChance = 0.5;
    }
  }
  const range = Math.min(world.maxFire, BOMBER_FIRE_START + (bot.blastBonus ?? 0));

  if (world.tick % every === 0) {
    const dirs: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [0, 0],
    ];
    if (cellInBlastPreview(world, bot.x, bot.y)) {
      for (const [dx, dy] of dirs) {
        if (!dx && !dy) continue;
        const nx = bot.x + dx;
        const ny = bot.y + dy;
        if (walkable(world, nx, ny) && !cellInBlastPreview(world, nx, ny)) {
          tryMove(world, bot.id, dx, dy);
          return;
        }
      }
    }

    const target = pickChaseTarget(world, bot);
    const wanderDirs = dirs.filter(([dx, dy]) => dx !== 0 || dy !== 0);
    let picked: [number, number] = wanderDirs[Math.floor(Math.random() * wanderDirs.length)]!;
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
  const wantHunt =
    target && linedUpForBomb(world, bot, target, range) && Math.random() < world.difficulty.aiHuntChance;
  const wantWander = Math.random() < bombChance;
  if (wantHunt || wantWander) plantBomb(world, bot.id, now);
}

/** GAME-DEV-011 — detonate one bomb; chain-trigger others in blast path. Returns chain index (1-based). */
function detonateOneBomb(
  world: BomberWorld,
  bomb: Bomb,
  now: number,
  chainIndex: number,
  queue: Bomb[]
): void {
  const ownerRef = world.players[bomb.ownerId];
  const cells = blastCells(world, bomb, ownerRef);
  world.blasts.push({ id: `blast-${bomb.id}`, cells, until: now + BOMBER_BLAST_MS });

  if (ownerRef) {
    ownerRef.bombsLeft = Math.min(ownerRef.bombsMax, ownerRef.bombsLeft + 1);
    if (chainIndex >= 2) {
      const bonus = BOMBER_CHAIN_BONUS * (chainIndex - 1);
      ownerRef.score = (ownerRef.score ?? 0) + bonus;
      ownerRef.feedback = { kind: "chain", amount: chainIndex, x: bomb.x, y: bomb.y };
    } else {
      ownerRef.feedback = { kind: "blast", amount: 0, x: bomb.x, y: bomb.y };
    }
  }

  for (const cell of cells) {
    const idx = world.bombs.findIndex((b) => b.x === cell.x && b.y === cell.y);
    if (idx >= 0) {
      queue.push(world.bombs[idx]!);
      world.bombs.splice(idx, 1);
    }
  }

  for (const p of Object.values(world.players)) {
    if (!p.alive) continue;
    if (cells.some((c) => c.x === p.x && c.y === p.y)) {
      markDeath(world, p);
      if (ownerRef && ownerRef.id !== p.id) {
        ownerRef.kills += 1;
        ownerRef.score = (ownerRef.score ?? 0) + BOMBER_SCORE_KILL;
        ownerRef.feedback = { kind: "kill", amount: BOMBER_SCORE_KILL, x: p.x, y: p.y };
      }
    }
  }
}

function processBombDetonations(world: BomberWorld, now: number): void {
  const fuse = world.fuseMs || BOMBER_BOMB_FUSE_MS;
  const ready = world.bombs.filter((b) => now - b.plantedAt >= fuse);
  if (ready.length === 0) return;

  world.bombs = world.bombs.filter((b) => !ready.some((r) => r.id === b.id));
  const queue = [...ready];
  let chainIndex = 0;

  while (queue.length > 0) {
    const bomb = queue.shift()!;
    chainIndex += 1;
    detonateOneBomb(world, bomb, now, chainIndex, queue);
  }
}

export function remainingTimeSec(world: BomberWorld, now = Date.now()): number {
  const untilSd = BOMBER_SUDDEN_DEATH_AT_SEC - (now - world.matchStartedAt) / 1000;
  if (untilSd > 0) return Math.ceil(untilSd);
  return 0;
}

export function firePowerOf(p: BomberPlayer): number {
  return BOMBER_FIRE_START + (p.blastBonus ?? 0);
}

/** Compact snapshot for host→client sync. */
export type BomberSyncState = {
  tick: number;
  mapId: number;
  playerSlots: PlayerSlots;
  matchStartedAt: number;
  matchOver?: boolean;
  winnerId?: string | null;
  isDraw?: boolean;
  suddenDeathActive: boolean;
  suddenDeathRing: number;
  grid: Cell[][];
  players: BomberPlayer[];
  bombs: Bomb[];
  blasts: Blast[];
  powerUps: PowerUp[];
  coins: BomberCoin[];
  deathOrder: string[];
  fuseMs: number;
  maxFire: number;
};

export function serializeBomberState(world: BomberWorld): BomberSyncState {
  return {
    tick: world.tick,
    mapId: world.mapId,
    playerSlots: world.playerSlots,
    matchStartedAt: world.matchStartedAt,
    matchOver: world.matchOver,
    winnerId: world.winnerId,
    isDraw: world.isDraw,
    suddenDeathActive: world.suddenDeathActive,
    suddenDeathRing: world.suddenDeathRing,
    grid: world.grid.map((r) => r.slice()),
    players: Object.values(world.players).map((p) => ({ ...p })),
    bombs: world.bombs.map((b) => ({ ...b })),
    blasts: world.blasts.map((b) => ({ ...b, cells: b.cells.map((c) => ({ ...c })) })),
    powerUps: world.powerUps.map((p) => ({ ...p })),
    coins: world.coins.map((c) => ({ ...c })),
    deathOrder: world.deathOrder.slice(),
    fuseMs: world.fuseMs,
    maxFire: world.maxFire,
  };
}

export type ApplyBomberSyncOpts = {
  /** Reject apply when any pinned human would disappear from synced players. */
  rejectMissingHumanIds?: string[];
  /** Reject stale authoritative snapshots (tick regression). */
  rejectStaleTick?: boolean;
};

export function applyBomberSyncState(
  world: BomberWorld,
  state: BomberSyncState,
  opts?: ApplyBomberSyncOpts
): boolean {
  if (opts?.rejectStaleTick && state.tick < world.tick) {
    return false;
  }
  if (opts?.rejectMissingHumanIds?.length) {
    for (const id of opts.rejectMissingHumanIds) {
      const local = world.players[id];
      if (local && !local.isBot && !state.players.some((p) => p.id === id && !p.isBot)) {
        return false;
      }
    }
  }

  world.tick = state.tick;
  world.mapId = state.mapId;
  world.playerSlots = state.playerSlots;
  world.matchStartedAt = state.matchStartedAt;
  world.matchOver = state.matchOver;
  world.winnerId = state.winnerId;
  world.isDraw = state.isDraw;
  world.suddenDeathActive = state.suddenDeathActive;
  world.suddenDeathRing = state.suddenDeathRing;
  world.grid = state.grid.map((r) => r.slice());
  world.bombs = state.bombs.map((b) => ({ ...b }));
  world.blasts = state.blasts.map((b) => ({ ...b, cells: b.cells.map((c) => ({ ...c })) }));
  world.powerUps = state.powerUps.map((p) => ({ ...p }));
  world.coins = (state.coins ?? []).map((c) => ({ ...c }));
  world.deathOrder = state.deathOrder.slice();
  world.fuseMs = state.fuseMs;
  world.maxFire = state.maxFire;
  world.players = {};
  for (const p of state.players) {
    world.players[p.id] = { ...p };
  }
  updateRankings(world);
  return true;
}

/** Merge a remote bomb if missing (low-latency bomb visibility before full state). */
export function upsertRemoteBomb(world: BomberWorld, bomb: Bomb): void {
  if (world.bombs.some((b) => b.id === bomb.id)) return;
  if (world.bombs.some((b) => b.x === bomb.x && b.y === bomb.y)) return;
  world.bombs.push({ ...bomb });
}

export function tickBomberWorld(
  world: BomberWorld,
  now = Date.now(),
  opts?: { deferMatchEnd?: boolean; skipBots?: boolean }
): void {
  if (world.matchOver) return;
  world.tick += 1;

  applySuddenDeath(world, now);

  if (!opts?.skipBots) {
    for (const p of Object.values(world.players)) {
      p.feedback = undefined;
      if (p.isBot) botThink(world, p, now);
    }
  } else {
    for (const p of Object.values(world.players)) {
      p.feedback = undefined;
    }
  }

  processBombDetonations(world, now);
  world.blasts = world.blasts.filter((b) => b.until > now);

  // Gradual risk penalty decay
  for (const p of Object.values(world.players)) {
    if ((p.speedPenalty ?? 0) > 0 && world.tick % 40 === 0) {
      p.speedPenalty = Math.max(0, (p.speedPenalty ?? 0) - 1);
    }
  }

  const living = Object.values(world.players).filter((p) => p.alive);
  if (living.length <= 1 && !opts?.deferMatchEnd) finalizeMatch(world);
  updateRankings(world);
}

/** GAME-DEV-003 — in-place solo restart (same map, fresh grid). */
export function restartSoloMatch(
  world: BomberWorld,
  localId: string,
  nickname: string,
  color?: string
): BomberWorld {
  const next = createBomberWorld(localId, nickname, {
    mapId: world.mapId,
    playerSlots: world.playerSlots,
    humans: [{ id: localId, nickname, color }],
    matchStartedAt: Date.now(),
  });
  if (color) {
    const p = next.players[localId];
    if (p) p.color = color;
  }
  return next;
}
