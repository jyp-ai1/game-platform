/** Re:Front — OpenFront-style territory strategy core (GAME-OPEN-001). */

export const RF_GRID = 64;
export const RF_CELL = 10;
export const RF_TICK_MS = 200;
export const RF_ECON_MS = 1000;
export const RF_MAX_PLAYERS = 4;
export const RF_MAX_NATIONS = 8;
export const RF_VICTORY_PCT = 60;
export const RF_EXPAND_COST = 10;
export const RF_ATTACK_COST = 25;

export type RfNation = {
  id: string;
  slot: number;
  nickname: string;
  color: string;
  alive: boolean;
  isBot: boolean;
  gold: number;
  troops: number;
  population: number;
  territoryPct: number;
  eliminatedAt?: number;
};

export type RfFlash = {
  cx: number;
  cy: number;
  color: string;
  until: number;
  kind: "expand" | "attack" | "capture";
};

export type RfPopup = {
  id: number;
  text: string;
  color: string;
  until: number;
};

export type RfWorld = {
  tick: number;
  econTick: number;
  roundStartedAt: number;
  roundOver: boolean;
  winnerId: string | null;
  /** 0 = neutral, 1..N = nation slot */
  owner: Uint8Array;
  nations: Record<string, RfNation>;
  slotToId: Record<number, string>;
  idToSlot: Record<string, number>;
  flashes: RfFlash[];
  popups: RfPopup[];
  popupSeq: number;
  rankings: Array<{ id: string; nickname: string; territoryPct: number; troops: number }>;
  /** QA/local: lower victory threshold for faster game-over tests */
  fastVictoryPct?: number;
};

export type RfAction =
  | { type: "expand"; cx: number; cy: number; nationId: string }
  | { type: "attack"; cx: number; cy: number; nationId: string };

export type RfSyncState = {
  tick: number;
  econTick: number;
  roundStartedAt: number;
  roundOver: boolean;
  winnerId: string | null;
  owner: number[];
  nations: RfNation[];
  flashes: RfFlash[];
  popups: RfPopup[];
  rankings: RfWorld["rankings"];
};

export type HumanSeat = { id: string; nickname: string; color?: string };

const NATION_COLORS = ["#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#a78bfa", "#fb7185", "#38bdf8", "#f97316"];
const BOT_NAMES = ["Northland", "Eastwood", "Ironvale", "Sandreach"];

function idx(cx: number, cy: number): number {
  return cy * RF_GRID + cx;
}

function inBounds(cx: number, cy: number): boolean {
  return cx >= 0 && cy >= 0 && cx < RF_GRID && cy < RF_GRID;
}

function neighbors4(cx: number, cy: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (cx > 0) out.push([cx - 1, cy]);
  if (cx < RF_GRID - 1) out.push([cx + 1, cy]);
  if (cy > 0) out.push([cx, cy - 1]);
  if (cy < RF_GRID - 1) out.push([cx, cy + 1]);
  return out;
}

function countOwned(world: RfWorld, slot: number): number {
  let n = 0;
  for (let i = 0; i < world.owner.length; i++) {
    if (world.owner[i] === slot) n++;
  }
  return n;
}

function recomputePct(world: RfWorld): void {
  const total = RF_GRID * RF_GRID;
  for (const n of Object.values(world.nations)) {
    if (!n.alive) {
      n.territoryPct = 0;
      continue;
    }
    const cells = countOwned(world, n.slot);
    n.territoryPct = Math.round((cells / total) * 10000) / 100;
  }
  world.rankings = Object.values(world.nations)
    .filter((n) => n.alive)
    .sort((a, b) => b.territoryPct - a.territoryPct)
    .map((n) => ({ id: n.id, nickname: n.nickname, territoryPct: n.territoryPct, troops: Math.floor(n.troops) }));
}

function addPopup(world: RfWorld, text: string, color: string, ms = 1800): void {
  world.popups.push({ id: ++world.popupSeq, text, color, until: Date.now() + ms });
  if (world.popups.length > 8) world.popups.shift();
}

function addFlash(world: RfWorld, cx: number, cy: number, color: string, kind: RfFlash["kind"]): void {
  world.flashes.push({ cx, cy, color, kind, until: Date.now() + 450 });
  if (world.flashes.length > 24) world.flashes.shift();
}

function claimBlock(world: RfWorld, cx: number, cy: number, w: number, h: number, slot: number): void {
  for (let y = cy; y < cy + h && y < RF_GRID; y++) {
    for (let x = cx; x < cx + w && x < RF_GRID; x++) {
      world.owner[idx(x, y)] = slot;
    }
  }
}

function findSpawn(slot: number): { cx: number; cy: number } {
  const c = Math.floor(RF_GRID / 2) - 2;
  const positions: Array<[number, number]> = [
    [c, c],
    [c + 3, c],
    [c, c + 3],
    [c + 3, c + 3],
    [c + 6, c],
    [c, c + 6],
    [c + 6, c + 3],
    [c + 3, c + 6],
  ];
  const [cx, cy] = positions[slot % positions.length]!;
  return { cx, cy };
}

export function createRfWorld(localId: string, nickname: string, humans: HumanSeat[] = []): RfWorld {
  const now = Date.now();
  const world: RfWorld = {
    tick: 0,
    econTick: 0,
    roundStartedAt: now,
    roundOver: false,
    winnerId: null,
    owner: new Uint8Array(RF_GRID * RF_GRID),
    nations: {},
    slotToId: {},
    idToSlot: {},
    flashes: [],
    popups: [],
    popupSeq: 0,
    rankings: [],
  };

  const seats: HumanSeat[] =
    humans.length > 0 ? humans.slice(0, RF_MAX_PLAYERS) : [{ id: localId, nickname, color: NATION_COLORS[0] }];

  seats.forEach((seat, i) => {
    const slot = i + 1;
    const spawn = findSpawn(i);
    world.nations[seat.id] = {
      id: seat.id,
      slot,
      nickname: seat.nickname,
      color: seat.color ?? NATION_COLORS[i % NATION_COLORS.length]!,
      alive: true,
      isBot: false,
      gold: 100,
      troops: 200,
      population: 50,
      territoryPct: 0,
    };
    world.slotToId[slot] = seat.id;
    world.idToSlot[seat.id] = slot;
    claimBlock(world, spawn.cx, spawn.cy, 2, 2, slot);
  });

  const botCount = Math.max(2, 3 - seats.length);
  for (let b = 0; b < botCount; b++) {
    const slot = seats.length + b + 1;
    const botId = `bot-${slot}`;
    const spawn = findSpawn(seats.length + b);
    world.nations[botId] = {
      id: botId,
      slot,
      nickname: BOT_NAMES[b % BOT_NAMES.length]!,
      color: NATION_COLORS[(seats.length + b) % NATION_COLORS.length]!,
      alive: true,
      isBot: true,
      gold: 80,
      troops: 160,
      population: 40,
      territoryPct: 0,
    };
    world.slotToId[slot] = botId;
    world.idToSlot[botId] = slot;
    claimBlock(world, spawn.cx, spawn.cy, 2, 2, slot);
  }

  recomputePct(world);
  return world;
}

export function reconcileHumans(world: RfWorld, humans: HumanSeat[]): void {
  for (const h of humans) {
    if (world.nations[h.id]) {
      world.nations[h.id]!.nickname = h.nickname;
      if (h.color) world.nations[h.id]!.color = h.color;
    }
  }
}

function nationAt(world: RfWorld, cx: number, cy: number): RfNation | null {
  if (!inBounds(cx, cy)) return null;
  const slot = world.owner[idx(cx, cy)]!;
  if (!slot) return null;
  const id = world.slotToId[slot];
  return id ? (world.nations[id] ?? null) : null;
}

function isAdjacentToSlot(world: RfWorld, cx: number, cy: number, slot: number): boolean {
  for (const [nx, ny] of neighbors4(cx, cy)) {
    if (world.owner[idx(nx, ny)] === slot) return true;
  }
  return false;
}

export function canExpand(world: RfWorld, cx: number, cy: number, nationId: string): boolean {
  const n = world.nations[nationId];
  if (!n?.alive || world.roundOver) return false;
  if (!inBounds(cx, cy)) return false;
  if (world.owner[idx(cx, cy)] !== 0) return false;
  if (n.troops < RF_EXPAND_COST) return false;
  return isAdjacentToSlot(world, cx, cy, n.slot);
}

export function canAttack(world: RfWorld, cx: number, cy: number, nationId: string): boolean {
  const n = world.nations[nationId];
  if (!n?.alive || world.roundOver) return false;
  if (!inBounds(cx, cy)) return false;
  const targetSlot = world.owner[idx(cx, cy)]!;
  if (!targetSlot || targetSlot === n.slot) return false;
  const target = nationAt(world, cx, cy);
  if (!target?.alive) return false;
  if (n.troops < RF_ATTACK_COST) return false;
  return isAdjacentToSlot(world, cx, cy, n.slot);
}

export function applyExpand(world: RfWorld, cx: number, cy: number, nationId: string): boolean {
  if (!canExpand(world, cx, cy, nationId)) return false;
  const n = world.nations[nationId]!;
  world.owner[idx(cx, cy)] = n.slot;
  n.troops -= RF_EXPAND_COST;
  n.gold += 8;
  addFlash(world, cx, cy, n.color, "expand");
  recomputePct(world);
  addPopup(world, `+Territory · ${n.territoryPct}%`, n.color);
  checkVictory(world);
  return true;
}

export function applyAttack(world: RfWorld, cx: number, cy: number, nationId: string): boolean {
  if (!canAttack(world, cx, cy, nationId)) return false;
  const attacker = world.nations[nationId]!;
  const defender = nationAt(world, cx, cy)!;
  const attackPower = Math.floor(attacker.troops * 0.35 + attacker.population * 0.05);
  const defensePower = Math.floor(defender.troops * 0.25 + countOwned(world, defender.slot) * 0.4);
  addFlash(world, cx, cy, "#ffffff", "attack");

  if (attackPower >= defensePower) {
    world.owner[idx(cx, cy)] = attacker.slot;
    attacker.troops = Math.max(10, attacker.troops - RF_ATTACK_COST);
    defender.troops = Math.max(0, defender.troops - Math.floor(defensePower * 0.6));
    addFlash(world, cx, cy, attacker.color, "capture");
    addPopup(world, `Captured! −${RF_ATTACK_COST} troops`, attacker.color);
    if (defender.troops <= 0 && countOwned(world, defender.slot) <= 3) {
      eliminateNation(world, defender.id);
    }
  } else {
    attacker.troops = Math.max(5, attacker.troops - RF_ATTACK_COST);
    defender.troops = Math.max(5, defender.troops - Math.floor(attackPower * 0.2));
    addPopup(world, `Repulsed · −${RF_ATTACK_COST} troops`, "#f87171");
  }

  recomputePct(world);
  checkVictory(world);
  return true;
}

function eliminateNation(world: RfWorld, nationId: string): void {
  const n = world.nations[nationId];
  if (!n || !n.alive) return;
  n.alive = false;
  n.eliminatedAt = Date.now();
  n.troops = 0;
  for (let i = 0; i < world.owner.length; i++) {
    if (world.owner[i] === n.slot) world.owner[i] = 0;
  }
  addPopup(world, `${n.nickname} eliminated`, "#94a3b8");
}

function checkVictory(world: RfWorld): void {
  if (world.roundOver) return;
  const alive = Object.values(world.nations).filter((n) => n.alive);
  for (const n of alive) {
    const winPct = world.fastVictoryPct ?? RF_VICTORY_PCT;
    if (n.territoryPct >= winPct) {
      world.roundOver = true;
      world.winnerId = n.id;
      return;
    }
  }
  if (alive.length === 1) {
    world.roundOver = true;
    world.winnerId = alive[0]!.id;
  }
  if (alive.length === 0) {
    world.roundOver = true;
    world.winnerId = null;
  }
}

function tickEconomy(world: RfWorld): void {
  world.econTick++;
  for (const n of Object.values(world.nations)) {
    if (!n.alive) continue;
    const cells = countOwned(world, n.slot);
    if (cells <= 0) {
      eliminateNation(world, n.id);
      continue;
    }
    n.gold += 2 + cells * 0.15;
    n.population += 1 + cells * 0.08;
    n.troops += 2 + cells * 0.06 + n.population * 0.01;
    n.troops = Math.min(n.troops, 5000);
  }
  recomputePct(world);
  checkVictory(world);
}

function pickAiExpand(world: RfWorld, nationId: string): [number, number] | null {
  const n = world.nations[nationId];
  if (!n?.alive) return null;
  const candidates: Array<[number, number]> = [];
  for (let cy = 0; cy < RF_GRID; cy++) {
    for (let cx = 0; cx < RF_GRID; cx++) {
      if (canExpand(world, cx, cy, nationId)) candidates.push([cx, cy]);
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

function pickAiAttack(world: RfWorld, nationId: string): [number, number] | null {
  const n = world.nations[nationId];
  if (!n?.alive || n.troops < RF_ATTACK_COST * 1.2) return null;
  if (Math.random() > 0.35) return null;
  const candidates: Array<[number, number]> = [];
  for (let cy = 0; cy < RF_GRID; cy++) {
    for (let cx = 0; cx < RF_GRID; cx++) {
      if (canAttack(world, cx, cy, nationId)) candidates.push([cx, cy]);
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

function tickAi(world: RfWorld): void {
  for (const n of Object.values(world.nations)) {
    if (!n.alive || !n.isBot) continue;
    const attack = pickAiAttack(world, n.id);
    if (attack) {
      applyAttack(world, attack[0], attack[1], n.id);
      continue;
    }
    if (n.troops >= RF_EXPAND_COST) {
      const expand = pickAiExpand(world, n.id);
      if (expand) applyExpand(world, expand[0], expand[1], n.id);
    }
  }
}

export function tickRfWorld(world: RfWorld, now = Date.now()): void {
  if (world.roundOver) return;
  world.tick++;
  world.flashes = world.flashes.filter((f) => f.until > now);
  world.popups = world.popups.filter((p) => p.until > now);

  if (world.tick % Math.round(RF_ECON_MS / RF_TICK_MS) === 0) {
    tickEconomy(world);
  }
  if (world.tick % 3 === 0) {
    tickAi(world);
  }
}

export function applyRfAction(world: RfWorld, action: RfAction): boolean {
  if (action.type === "expand") return applyExpand(world, action.cx, action.cy, action.nationId);
  return applyAttack(world, action.cx, action.cy, action.nationId);
}

export function serializeRfState(world: RfWorld): RfSyncState {
  return {
    tick: world.tick,
    econTick: world.econTick,
    roundStartedAt: world.roundStartedAt,
    roundOver: world.roundOver,
    winnerId: world.winnerId,
    owner: Array.from(world.owner),
    nations: Object.values(world.nations).map((n) => ({ ...n })),
    flashes: world.flashes.map((f) => ({ ...f })),
    popups: world.popups.map((p) => ({ ...p })),
    rankings: world.rankings.slice(),
  };
}

export function applyRfSyncState(world: RfWorld, state: RfSyncState, opts?: { rejectStaleTick?: boolean }): void {
  if (opts?.rejectStaleTick && state.tick < world.tick) return;
  world.tick = state.tick;
  world.econTick = state.econTick;
  world.roundStartedAt = state.roundStartedAt;
  world.roundOver = state.roundOver;
  world.winnerId = state.winnerId;
  world.owner = new Uint8Array(state.owner);
  world.flashes = state.flashes.map((f) => ({ ...f }));
  world.popups = state.popups.map((p) => ({ ...p }));
  world.rankings = state.rankings.slice();

  world.slotToId = {};
  world.idToSlot = {};
  for (const n of state.nations) {
    world.nations[n.id] = { ...n };
    world.slotToId[n.slot] = n.id;
    world.idToSlot[n.id] = n.slot;
  }
}

export function restartRfRound(world: RfWorld, localId: string, nickname: string, humans: HumanSeat[]): void {
  const fresh = createRfWorld(localId, nickname, humans);
  Object.assign(world, fresh);
}

export function cellAt(world: RfWorld, cx: number, cy: number): { slot: number; nation: RfNation | null } {
  if (!inBounds(cx, cy)) return { slot: 0, nation: null };
  const slot = world.owner[idx(cx, cy)]!;
  const id = slot ? world.slotToId[slot] : undefined;
  return { slot, nation: id ? (world.nations[id] ?? null) : null };
}

export function localNation(world: RfWorld, deviceId: string): RfNation | null {
  return world.nations[deviceId] ?? null;
}

export function rfQaForceWin(world: RfWorld, nationId: string): void {
  world.roundOver = true;
  world.winnerId = nationId;
}

export function borderLength(world: RfWorld, slot: number): number {
  let borders = 0;
  for (let cy = 0; cy < RF_GRID; cy++) {
    for (let cx = 0; cx < RF_GRID; cx++) {
      if (world.owner[idx(cx, cy)] !== slot) continue;
      for (const [nx, ny] of neighbors4(cx, cy)) {
        const other = world.owner[idx(nx, ny)]!;
        if (other !== slot) borders++;
      }
    }
  }
  return borders;
}
