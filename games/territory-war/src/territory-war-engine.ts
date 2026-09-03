/** Territory War — grid-based territory IO (GAME-DEV-012R). */

export const TW_TICK_MS = 50;
export const TW_ROUND_MS = 4 * 60_000;
export const TW_GRID = 128;
export const TW_CELL = 20;
export const TW_WORLD = TW_GRID * TW_CELL;
export const TW_MAX_PLAYERS = 4;
export const TW_START_RADIUS = 5;
export const TW_BASE_SPEED = 3.6;
export const TW_BOOST_MULT = 1.65;
export const TW_BOOST_MS = 4_000;
export const TW_CUTTER_MS = 5_000;
export const TW_SHIELD_MS = 5_000;
export const TW_SCORE_PER_CELL = 2;
export const TW_SCORE_CUT = 250;

export type ItemKind = "boost" | "cutter" | "shield";
export type BotRole = "expander" | "hunter" | "defender";
export type FeedbackKind =
  | "claim"
  | "big_claim"
  | "cut"
  | "ko"
  | "danger"
  | "rank1"
  | "boost"
  | "cutter"
  | "shield";

export type TwFeedback = {
  kind: FeedbackKind;
  text: string;
  x: number;
  y: number;
};

export type TwPlayer = {
  id: string;
  slot: number;
  nickname: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  score: number;
  knockouts: number;
  territoryPct: number;
  cellCount: number;
  sizeTier: 0 | 1 | 2;
  outside: boolean;
  trail: number[];
  boostUntil: number;
  cutterUntil: number;
  shieldUntil: number;
  shieldCharges: number;
  isBot?: boolean;
  botRole?: BotRole;
  place?: number;
  feedback?: TwFeedback;
  spawnX: number;
  spawnY: number;
};

export type TwItem = {
  id: string;
  kind: ItemKind;
  x: number;
  y: number;
};

export type TerritoryWorld = {
  tick: number;
  roundStartedAt: number;
  roundOver: boolean;
  winnerId: string | null;
  owner: Uint8Array;
  trail: Uint8Array;
  players: Record<string, TwPlayer>;
  items: TwItem[];
  rankings: Array<{ id: string; nickname: string; score: number; territoryPct: number }>;
  idToSlot: Record<string, number>;
  slotToId: Record<number, string>;
};

export type TwInput = {
  deviceId: string;
  dx: number;
  dy: number;
  boost?: boolean;
  at?: number;
};

export type TwSyncState = {
  tick: number;
  roundStartedAt: number;
  roundOver: boolean;
  winnerId: string | null;
  owner: number[];
  trail: number[];
  players: TwPlayer[];
  items: TwItem[];
};

export type HumanSeat = { id: string; nickname: string; color?: string };

const COLORS = ["#22d3ee", "#f472b6", "#fbbf24", "#34d399"];
const TOTAL_CELLS = TW_GRID * TW_GRID;

function idx(cx: number, cy: number): number {
  return cy * TW_GRID + cx;
}

function clampCell(c: number): number {
  return Math.max(0, Math.min(TW_GRID - 1, c));
}

function cellOf(x: number, y: number): { cx: number; cy: number; i: number } {
  const cx = clampCell(Math.floor(x / TW_CELL));
  const cy = clampCell(Math.floor(y / TW_CELL));
  return { cx, cy, i: idx(cx, cy) };
}

export function territoryPctFor(count: number): number {
  return Math.round((count / TOTAL_CELLS) * 1000) / 10;
}

function sizeTierFromPct(pct: number): 0 | 1 | 2 {
  if (pct >= 12) return 2;
  if (pct >= 4) return 1;
  return 0;
}

function playerRadius(tier: 0 | 1 | 2): number {
  if (tier === 2) return 14;
  if (tier === 1) return 11;
  return 8;
}

export function playerVisualRadius(p: TwPlayer): number {
  return playerRadius(p.sizeTier);
}

function paintCircle(
  world: TerritoryWorld,
  cx: number,
  cy: number,
  r: number,
  slot: number
): number {
  let n = 0;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= TW_GRID || y >= TW_GRID) continue;
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
        const i = idx(x, y);
        if (world.owner[i] === 0) {
          world.owner[i] = slot;
          n++;
        } else if (world.owner[i] === slot) {
          n++;
        }
      }
    }
  }
  return n;
}

function recountPlayer(world: TerritoryWorld, p: TwPlayer): void {
  let count = 0;
  const slot = p.slot;
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (world.owner[i] === slot) count++;
  }
  p.cellCount = count;
  p.territoryPct = territoryPctFor(count);
  p.sizeTier = sizeTierFromPct(p.territoryPct);
}

function spawnPoints(count: number): Array<{ x: number; y: number; cx: number; cy: number }> {
  const margin = 18;
  const spots = [
    { cx: margin, cy: margin },
    { cx: TW_GRID - margin - 1, cy: margin },
    { cx: margin, cy: TW_GRID - margin - 1 },
    { cx: TW_GRID - margin - 1, cy: TW_GRID - margin - 1 },
  ];
  return spots.slice(0, count).map((s) => ({
    cx: s.cx,
    cy: s.cy,
    x: s.cx * TW_CELL + TW_CELL / 2,
    y: s.cy * TW_CELL + TW_CELL / 2,
  }));
}

export function createTerritoryWorld(
  localId: string,
  nickname: string,
  humans: HumanSeat[] = [{ id: localId, nickname }]
): TerritoryWorld {
  const now = Date.now();
  const world: TerritoryWorld = {
    tick: 0,
    roundStartedAt: now,
    roundOver: false,
    winnerId: null,
    owner: new Uint8Array(TOTAL_CELLS),
    trail: new Uint8Array(TOTAL_CELLS),
    players: {},
    items: [],
    rankings: [],
    idToSlot: {},
    slotToId: {},
  };
  reconcileHumans(world, humans.slice(0, TW_MAX_PLAYERS));
  spawnInitialItems(world);
  updateRankings(world);
  return world;
}

export function reconcileHumans(world: TerritoryWorld, humans: HumanSeat[]): void {
  let list = humans.slice(0, TW_MAX_PLAYERS);
  while (list.length < 2 && list.length < TW_MAX_PLAYERS) {
    const i = list.length;
    list.push({ id: `bot:${i}`, nickname: `Bot${i + 1}` });
  }

  const keep = new Set(list.map((h) => h.id));
  for (const id of Object.keys(world.players)) {
    if (!keep.has(id)) {
      const slot = world.players[id]?.slot;
      if (slot) {
        delete world.slotToId[slot];
        delete world.idToSlot[id];
      }
      delete world.players[id];
    }
  }

  const spawns = spawnPoints(list.length);
  const roles: BotRole[] = ["expander", "hunter", "defender", "expander"];
  list.forEach((h, i) => {
    const existing = world.players[h.id];
    const sp = spawns[i]!;
    if (existing) {
      existing.nickname = h.nickname;
      existing.isBot = h.id.startsWith("bot:");
      if (h.color) existing.color = h.color;
      if (existing.isBot) existing.botRole = roles[i % roles.length];
      return;
    }
    const slot = i + 1;
    world.idToSlot[h.id] = slot;
    world.slotToId[slot] = h.id;
    paintCircle(world, sp.cx, sp.cy, TW_START_RADIUS, slot);
    world.players[h.id] = {
      id: h.id,
      slot,
      nickname: h.nickname,
      color: h.color || COLORS[i % COLORS.length]!,
      x: sp.x,
      y: sp.y,
      vx: 0,
      vy: 0,
      alive: true,
      score: 0,
      knockouts: 0,
      territoryPct: 0,
      cellCount: 0,
      sizeTier: 0,
      outside: false,
      trail: [],
      boostUntil: 0,
      cutterUntil: 0,
      shieldUntil: 0,
      shieldCharges: 0,
      isBot: h.id.startsWith("bot:"),
      botRole: h.id.startsWith("bot:") ? roles[i % roles.length] : undefined,
      spawnX: sp.x,
      spawnY: sp.y,
    };
    recountPlayer(world, world.players[h.id]!);
  });
}

function spawnInitialItems(world: TerritoryWorld): void {
  const kinds: ItemKind[] = ["boost", "cutter", "shield"];
  for (let i = 0; i < 4; i++) {
    world.items.push(randomItem(world, kinds[i % 3]!));
  }
}

function randomItem(world: TerritoryWorld, kind?: ItemKind): TwItem {
  const kinds: ItemKind[] = ["boost", "cutter", "shield"];
  const k = kind ?? kinds[(world.tick + world.items.length) % kinds.length]!;
  const cx = 20 + ((world.tick * 17 + world.items.length * 31) % (TW_GRID - 40));
  const cy = 20 + ((world.tick * 13 + world.items.length * 23) % (TW_GRID - 40));
  return {
    id: `item-${world.tick}-${world.items.length}-${k}`,
    kind: k,
    x: cx * TW_CELL + TW_CELL / 2,
    y: cy * TW_CELL + TW_CELL / 2,
  };
}

function clearPlayerTrail(world: TerritoryWorld, p: TwPlayer): void {
  for (const t of p.trail) {
    if (world.trail[t] === p.slot) world.trail[t] = 0;
  }
  p.trail = [];
  p.outside = false;
}

function claimEnclosed(world: TerritoryWorld, p: TwPlayer): number {
  if (p.trail.length < 4) {
    clearPlayerTrail(world, p);
    return 0;
  }

  const slot = p.slot;
  const flooded = new Uint8Array(TOTAL_CELLS);
  const q: number[] = [];

  const canFlood = (i: number): boolean => {
    if (world.trail[i] === slot) return false;
    if (world.owner[i] !== 0) return false;
    return true;
  };

  for (let x = 0; x < TW_GRID; x++) {
    const a = idx(x, 0);
    const b = idx(x, TW_GRID - 1);
    if (canFlood(a)) q.push(a);
    if (canFlood(b)) q.push(b);
  }
  for (let y = 0; y < TW_GRID; y++) {
    const a = idx(0, y);
    const b = idx(TW_GRID - 1, y);
    if (canFlood(a)) q.push(a);
    if (canFlood(b)) q.push(b);
  }

  while (q.length) {
    const i = q.pop()!;
    if (flooded[i]) continue;
    if (!canFlood(i)) continue;
    flooded[i] = 1;
    const x = i % TW_GRID;
    const y = Math.floor(i / TW_GRID);
    if (x > 0) q.push(i - 1);
    if (x < TW_GRID - 1) q.push(i + 1);
    if (y > 0) q.push(i - TW_GRID);
    if (y < TW_GRID - 1) q.push(i + TW_GRID);
  }

  let claimed = 0;
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (flooded[i]) continue;
    if (world.trail[i] === slot) {
      world.trail[i] = 0;
      world.owner[i] = slot;
      claimed++;
      continue;
    }
    if (world.owner[i] === slot) continue;
    world.owner[i] = slot;
    claimed++;
  }

  clearPlayerTrail(world, p);
  p.score += claimed * TW_SCORE_PER_CELL;
  const pctGain = territoryPctFor(claimed);
  recountPlayer(world, p);

  if (claimed >= 80) {
    p.feedback = { kind: "big_claim", text: "BIG CLAIM!", x: p.x, y: p.y };
  } else if (pctGain >= 0.5) {
    p.feedback = {
      kind: "claim",
      text: `+${pctGain.toFixed(1)}% TERRITORY`,
      x: p.x,
      y: p.y,
    };
  }
  return claimed;
}

function killPlayer(world: TerritoryWorld, victim: TwPlayer, killer: TwPlayer | null): void {
  if (!victim.alive) return;
  victim.alive = false;
  clearPlayerTrail(world, victim);
  victim.feedback = { kind: "ko", text: "KO!", x: victim.x, y: victim.y };
  if (killer && killer.id !== victim.id) {
    killer.knockouts += 1;
    killer.score += TW_SCORE_CUT;
    killer.feedback = { kind: "cut", text: "CUT! +250", x: killer.x, y: killer.y };
  }
  const slot = victim.slot;
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (world.owner[i] === slot) world.owner[i] = 0;
    if (world.trail[i] === slot) world.trail[i] = 0;
  }
  victim.cellCount = 0;
  victim.territoryPct = 0;
  victim.sizeTier = 0;
}

function checkTrailCollisions(world: TerritoryWorld, now: number): void {
  for (const p of Object.values(world.players)) {
    if (!p.alive) continue;
    const { i } = cellOf(p.x, p.y);
    for (const other of Object.values(world.players)) {
      if (!other.alive || other.id === p.id) continue;
      if (!other.outside || other.trail.length === 0) continue;
      if (world.trail[i] !== other.slot) continue;
      if (other.shieldCharges > 0 && other.shieldUntil > now) {
        other.shieldCharges -= 1;
        other.feedback = { kind: "danger", text: "BLOCKED!", x: other.x, y: other.y };
        continue;
      }
      killPlayer(world, other, p);
    }
  }
}

function addTrailCell(world: TerritoryWorld, p: TwPlayer, cellI: number): void {
  if (world.owner[cellI] === p.slot) return;
  if (world.trail[cellI] === p.slot) return;
  world.trail[cellI] = p.slot;
  p.trail.push(cellI);
  p.outside = true;
}

export function applyTwInput(world: TerritoryWorld, input: TwInput, now = Date.now()): void {
  const p = world.players[input.deviceId];
  if (!p || !p.alive || world.roundOver) return;

  let dx = input.dx;
  let dy = input.dy;
  const len = Math.hypot(dx, dy);
  if (len > 0.01) {
    dx /= len;
    dy /= len;
  } else {
    return;
  }

  const speed = TW_BASE_SPEED * (now < p.boostUntil || input.boost ? TW_BOOST_MULT : 1);
  p.vx = dx * speed;
  p.vy = dy * speed;
}

function pickupItems(world: TerritoryWorld, p: TwPlayer, now: number): void {
  const idxItem = world.items.findIndex((it) => Math.hypot(it.x - p.x, it.y - p.y) < 22);
  if (idxItem < 0) return;
  const item = world.items[idxItem]!;
  world.items.splice(idxItem, 1);

  if (item.kind === "boost") {
    p.boostUntil = now + TW_BOOST_MS;
    p.feedback = { kind: "boost", text: "BOOST!", x: p.x, y: p.y };
  } else if (item.kind === "cutter") {
    p.cutterUntil = now + TW_CUTTER_MS;
    p.feedback = { kind: "cutter", text: "CUTTER!", x: p.x, y: p.y };
  } else if (item.kind === "shield") {
    p.shieldUntil = now + TW_SHIELD_MS;
    p.shieldCharges = 1;
    p.feedback = { kind: "shield", text: "SHIELD!", x: p.x, y: p.y };
  }
}

function botThink(world: TerritoryWorld, bot: TwPlayer, now: number): void {
  if (!bot.alive || world.roundOver) return;
  if (world.tick % 3 !== 0) return;

  const role = bot.botRole ?? "expander";
  let dx = 0;
  let dy = 0;

  if (role === "hunter") {
    let target: TwPlayer | null = null;
    let best = Infinity;
    for (const p of Object.values(world.players)) {
      if (!p.alive || p.id === bot.id || !p.outside || p.isBot) continue;
      const d = Math.hypot(p.x - bot.x, p.y - bot.y);
      if (d < best) {
        best = d;
        target = p;
      }
    }
    if (target && target.trail.length > 0) {
      const last = target.trail[target.trail.length - 1]!;
      const tx = (last % TW_GRID) * TW_CELL;
      const ty = Math.floor(last / TW_GRID) * TW_CELL;
      dx = tx - bot.x;
      dy = ty - bot.y;
    }
  }

  if (role === "defender" || (dx === 0 && dy === 0 && role !== "expander")) {
    const ang = (world.tick / 20 + bot.slot) * 0.15;
    dx = Math.cos(ang) * (bot.spawnX - bot.x) + Math.cos(ang + 1.2) * 40;
    dy = Math.sin(ang) * (bot.spawnY - bot.y) + Math.sin(ang + 1.2) * 40;
  }

  if (role === "expander" && dx === 0 && dy === 0) {
    const ang = (world.tick / 15 + bot.slot * 1.7) * 0.2;
    dx = Math.cos(ang) * 60;
    dy = Math.sin(ang) * 60;
    if (bot.outside && bot.trail.length > 40) {
      dx = bot.spawnX - bot.x;
      dy = bot.spawnY - bot.y;
    }
  }

  const len = Math.hypot(dx, dy);
  if (len > 0.01) {
    applyTwInput(
      world,
      {
        deviceId: bot.id,
        dx: dx / len,
        dy: dy / len,
        boost: bot.outside && bot.trail.length > 25,
      },
      now
    );
  }
}

function finalizeRound(world: TerritoryWorld): void {
  if (world.roundOver) return;
  world.roundOver = true;
  const sorted = Object.values(world.players).sort(
    (a, b) => b.territoryPct - a.territoryPct || b.score - a.score
  );
  let place = 1;
  for (const p of sorted) {
    p.place = place++;
  }
  world.winnerId = sorted[0]?.id ?? null;
  updateRankings(world);
}

export function tickTerritoryWorld(
  world: TerritoryWorld,
  now = Date.now(),
  opts?: { skipBots?: boolean }
): void {
  if (world.roundOver) return;
  world.tick += 1;

  if (now - world.roundStartedAt >= TW_ROUND_MS) {
    finalizeRound(world);
    return;
  }

  for (const p of Object.values(world.players)) {
    p.feedback = undefined;
  }

  if (!opts?.skipBots) {
    for (const p of Object.values(world.players)) {
      if (p.isBot) botThink(world, p, now);
    }
  }

  for (const p of Object.values(world.players)) {
    if (!p.alive) continue;

    p.x = Math.max(12, Math.min(TW_WORLD - 12, p.x + p.vx));
    p.y = Math.max(12, Math.min(TW_WORLD - 12, p.y + p.vy));

    const { i } = cellOf(p.x, p.y);
    const onOwn = world.owner[i] === p.slot;

    if (onOwn) {
      if (p.outside && p.trail.length > 0) {
        claimEnclosed(world, p);
      }
    } else {
      addTrailCell(world, p, i);
    }

    pickupItems(world, p, now);
    recountPlayer(world, p);
  }

  checkTrailCollisions(world, now);

  if (world.tick % 200 === 0 && world.items.length < 6) {
    world.items.push(randomItem(world));
  }

  updateRankings(world);
}

export function updateRankings(world: TerritoryWorld): void {
  world.rankings = Object.values(world.players)
    .filter((p) => p.alive || p.territoryPct > 0)
    .sort((a, b) => b.territoryPct - a.territoryPct || b.score - a.score)
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: Math.round(p.score),
      territoryPct: p.territoryPct,
    }));
}

export function serializeTwState(world: TerritoryWorld): TwSyncState {
  return {
    tick: world.tick,
    roundStartedAt: world.roundStartedAt,
    roundOver: world.roundOver,
    winnerId: world.winnerId,
    owner: Array.from(world.owner),
    trail: Array.from(world.trail),
    players: Object.values(world.players).map((p) => ({
      ...p,
      trail: p.trail.slice(-120),
    })),
    items: world.items.map((i) => ({ ...i })),
  };
}

export function applyTwSyncState(
  world: TerritoryWorld,
  state: TwSyncState,
  opts?: { rejectStaleTick?: boolean }
): boolean {
  if (opts?.rejectStaleTick && state.tick < world.tick) return false;

  world.tick = state.tick;
  world.roundStartedAt = state.roundStartedAt;
  world.roundOver = state.roundOver;
  world.winnerId = state.winnerId;
  world.owner = Uint8Array.from(state.owner);
  world.trail = Uint8Array.from(state.trail);
  world.items = state.items.map((i) => ({ ...i }));
  world.players = {};
  world.idToSlot = {};
  world.slotToId = {};
  for (const p of state.players) {
    world.players[p.id] = { ...p, trail: p.trail.slice() };
    world.idToSlot[p.id] = p.slot;
    world.slotToId[p.slot] = p.id;
  }
  updateRankings(world);
  return true;
}

export function restartTwRound(world: TerritoryWorld, humans: HumanSeat[]): TerritoryWorld {
  void world;
  return createTerritoryWorld(humans[0]?.id ?? "host", humans[0]?.nickname ?? "Host", humans);
}

export function remainingTwSec(world: TerritoryWorld, now = Date.now()): number {
  return Math.max(0, Math.ceil((TW_ROUND_MS - (now - world.roundStartedAt)) / 1000));
}

export function cameraFocus(p: TwPlayer | undefined): { x: number; y: number } {
  if (!p) return { x: TW_WORLD / 2, y: TW_WORLD / 2 };
  return { x: p.x, y: p.y };
}
