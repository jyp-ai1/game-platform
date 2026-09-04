/** Re:Front P0 — territory strategy core with onboarding loop. */

export const RF_GRID = 96;
export const RF_CELL = 8;
export const RF_TICK_MS = 200;
export const RF_ECON_MS = 1000;
export const RF_MAX_PLAYERS = 4;
export const RF_MAX_NATIONS = 8;
export const RF_VICTORY_PCT = 70;
export const RF_EXPAND_COST = 8;
export const RF_ATTACK_COST = 20;

export type RfTerrain = 0 | 1 | 2;
export type RfBuilding = 0 | 1 | 2;
export type RfAiPersonality = "expander" | "aggressor" | "turtle";

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
  personality?: RfAiPersonality;
  defendUntil?: number;
  tutorialAggressor?: boolean;
  eliminatedAt?: number;
};

export type RfFlash = {
  cx: number;
  cy: number;
  color: string;
  until: number;
  kind: "expand" | "attack" | "capture" | "build";
};

export type RfPopup = {
  id: number;
  text: string;
  color: string;
  until: number;
};

export type RfBattle = {
  cx: number;
  cy: number;
  attackerId: string;
  defenderId: string;
  atkTroops: number;
  defTroops: number;
  progress: number;
  until: number;
};

export type RfWorld = {
  tick: number;
  econTick: number;
  roundStartedAt: number;
  roundOver: boolean;
  winnerId: string | null;
  owner: Uint8Array;
  terrain: Uint8Array;
  buildings: Uint8Array;
  nations: Record<string, RfNation>;
  slotToId: Record<number, string>;
  idToSlot: Record<string, number>;
  flashes: RfFlash[];
  popups: RfPopup[];
  popupSeq: number;
  rankings: Array<{ id: string; nickname: string; territoryPct: number; troops: number }>;
  battle: RfBattle | null;
  pendingCounterAttack?: string;
  fastVictoryPct?: number;
};

export type RfAction =
  | { type: "expand"; cx: number; cy: number; nationId: string }
  | { type: "attack"; cx: number; cy: number; nationId: string; pct?: number }
  | { type: "defend"; nationId: string }
  | { type: "build"; cx: number; cy: number; nationId: string; kind: "city" | "defense" };

export type RfSyncState = {
  tick: number;
  econTick: number;
  roundStartedAt: number;
  roundOver: boolean;
  winnerId: string | null;
  owner: number[];
  terrain: number[];
  buildings: number[];
  nations: RfNation[];
  flashes: RfFlash[];
  popups: RfPopup[];
  rankings: RfWorld["rankings"];
  battle: RfBattle | null;
  pendingCounterAttack?: string;
};

export type HumanSeat = { id: string; nickname: string; color?: string };

const NATION_COLORS = ["#22d3ee", "#ef4444", "#fbbf24", "#34d399", "#a78bfa", "#fb7185", "#38bdf8", "#f97316"];
const BOT_NAMES = ["Red Kingdom", "Eastwood", "Ironvale"];
const BOT_PERSONALITIES: RfAiPersonality[] = ["aggressor", "expander", "turtle"];

const TERRAIN_EXPAND_MULT: Record<RfTerrain, number> = { 0: 1, 1: 1.35, 2: 1.8 };
const TERRAIN_DEFENSE_BONUS: Record<RfTerrain, number> = { 0: 0, 1: 4, 2: 10 };

export function terrainLabel(t: RfTerrain): string {
  if (t === 2) return "Mountain";
  if (t === 1) return "Highland";
  return "Plains";
}

export function terrainExpandCost(world: RfWorld, cx: number, cy: number): number {
  const t = world.terrain[idx(cx, cy)] as RfTerrain;
  return Math.ceil(RF_EXPAND_COST * TERRAIN_EXPAND_MULT[t]);
}

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

function generateTerrain(): Uint8Array {
  const t = new Uint8Array(RF_GRID * RF_GRID);
  for (let cy = 0; cy < RF_GRID; cy++) {
    for (let cx = 0; cx < RF_GRID; cx++) {
      const n = Math.sin(cx * 0.31) * Math.cos(cy * 0.27) + Math.sin((cx + cy) * 0.15);
      if (n > 0.55) t[idx(cx, cy)] = 2;
      else if (n > 0.15) t[idx(cx, cy)] = 1;
      else t[idx(cx, cy)] = 0;
    }
  }
  return t;
}

function countOwned(world: RfWorld, slot: number): number {
  let n = 0;
  for (let i = 0; i < world.owner.length; i++) {
    if (world.owner[i] === slot) n++;
  }
  return n;
}

function buildingDefenseBonus(world: RfWorld, cx: number, cy: number): number {
  const b = world.buildings[idx(cx, cy)] as RfBuilding;
  if (b === 2) return 18;
  return 0;
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

function addPopup(world: RfWorld, text: string, color: string, ms = 2200): void {
  world.popups.push({ id: ++world.popupSeq, text, color, until: Date.now() + ms });
  if (world.popups.length > 10) world.popups.shift();
}

function addFlash(world: RfWorld, cx: number, cy: number, color: string, kind: RfFlash["kind"]): void {
  world.flashes.push({ cx, cy, color, kind, until: Date.now() + 500 });
  if (world.flashes.length > 32) world.flashes.shift();
}

function claimBlock(world: RfWorld, cx: number, cy: number, w: number, h: number, slot: number): void {
  for (let y = cy; y < cy + h && y < RF_GRID; y++) {
    for (let x = cx; x < cx + w && x < RF_GRID; x++) {
      world.owner[idx(x, y)] = slot;
    }
  }
}

function findSpawn(slot: number, offset = 0): { cx: number; cy: number } {
  const margin = 8;
  const positions: Array<[number, number]> = [
    [margin, margin],
    [RF_GRID - margin - 3, margin],
    [margin, RF_GRID - margin - 3],
    [RF_GRID - margin - 3, RF_GRID - margin - 3],
    [Math.floor(RF_GRID / 2) - 2, margin],
    [margin, Math.floor(RF_GRID / 2) - 2],
  ];
  const [cx, cy] = positions[(slot + offset) % positions.length]!;
  return { cx, cy };
}

export function createRfWorld(localId: string, nickname: string, humans: HumanSeat[] = []): RfWorld {
  const world: RfWorld = {
    tick: 0,
    econTick: 0,
    roundStartedAt: Date.now(),
    roundOver: false,
    winnerId: null,
    owner: new Uint8Array(RF_GRID * RF_GRID),
    terrain: generateTerrain(),
    buildings: new Uint8Array(RF_GRID * RF_GRID),
    nations: {},
    slotToId: {},
    idToSlot: {},
    flashes: [],
    popups: [],
    popupSeq: 0,
    rankings: [],
    battle: null,
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
      gold: 120,
      troops: 180,
      population: 60,
      territoryPct: 0,
    };
    world.slotToId[slot] = seat.id;
    world.idToSlot[seat.id] = slot;
    claimBlock(world, spawn.cx, spawn.cy, 3, 3, slot);
  });

  const botCount = 3;
  for (let b = 0; b < botCount; b++) {
    const slot = seats.length + b + 1;
    const botId = `bot-${slot}`;
    const spawn = findSpawn(seats.length + b, b === 0 ? 1 : 0);
    world.nations[botId] = {
      id: botId,
      slot,
      nickname: BOT_NAMES[b % BOT_NAMES.length]!,
      color: NATION_COLORS[(seats.length + b) % NATION_COLORS.length]!,
      alive: true,
      isBot: true,
      gold: 90,
      troops: b === 0 ? 140 : 160,
      population: 45,
      territoryPct: 0,
      personality: BOT_PERSONALITIES[b % BOT_PERSONALITIES.length],
      tutorialAggressor: b === 0,
    };
    world.slotToId[slot] = botId;
    world.idToSlot[botId] = slot;
    claimBlock(world, spawn.cx, spawn.cy, 3, 3, slot);
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
  const cost = terrainExpandCost(world, cx, cy);
  if (n.troops < cost) return false;
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

export function canBuild(
  world: RfWorld,
  cx: number,
  cy: number,
  nationId: string,
  kind: "city" | "defense"
): boolean {
  const n = world.nations[nationId];
  if (!n?.alive || world.roundOver) return false;
  if (!inBounds(cx, cy)) return false;
  if (world.owner[idx(cx, cy)] !== n.slot) return false;
  if (world.buildings[idx(cx, cy)] !== 0) return false;
  const cost = kind === "city" ? 80 : 60;
  return n.gold >= cost;
}

export function findExpandTargets(world: RfWorld, nationId: string, limit = 12): Array<{ cx: number; cy: number }> {
  const out: Array<{ cx: number; cy: number }> = [];
  for (let cy = 0; cy < RF_GRID; cy++) {
    for (let cx = 0; cx < RF_GRID; cx++) {
      if (canExpand(world, cx, cy, nationId)) out.push({ cx, cy });
    }
  }
  out.sort((a, b) => {
    const ta = world.terrain[idx(a.cx, a.cy)] as RfTerrain;
    const tb = world.terrain[idx(b.cx, b.cy)] as RfTerrain;
    return ta - tb;
  });
  return out.slice(0, limit);
}

export function findNearestEnemy(world: RfWorld, nationId: string): RfNation | null {
  const me = world.nations[nationId];
  if (!me) return null;
  let best: RfNation | null = null;
  let bestD = Infinity;
  for (const n of Object.values(world.nations)) {
    if (!n.alive || n.id === nationId) continue;
    const d = Math.abs(n.territoryPct - me.territoryPct) + (n.tutorialAggressor ? -5 : 0);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

export function applyExpand(world: RfWorld, cx: number, cy: number, nationId: string): boolean {
  if (!canExpand(world, cx, cy, nationId)) return false;
  const n = world.nations[nationId]!;
  const cost = terrainExpandCost(world, cx, cy);
  world.owner[idx(cx, cy)] = n.slot;
  n.troops -= cost;
  n.gold += 12;
  n.population += 2;
  addFlash(world, cx, cy, n.color, "expand");
  recomputePct(world);
  addPopup(world, `+1 TERRITORY · +120 GOLD`, n.color);
  checkVictory(world);
  return true;
}

export function applyAttack(
  world: RfWorld,
  cx: number,
  cy: number,
  nationId: string,
  pct = 0.5
): boolean {
  if (!canAttack(world, cx, cy, nationId)) return false;
  const attacker = world.nations[nationId]!;
  const defender = nationAt(world, cx, cy)!;
  const commit = Math.max(RF_ATTACK_COST, Math.floor(attacker.troops * Math.min(1, Math.max(0.25, pct))));
  const terrainBonus = TERRAIN_DEFENSE_BONUS[world.terrain[idx(cx, cy)] as RfTerrain];
  const defPost = buildingDefenseBonus(world, cx, cy);
  const defendBuff = defender.defendUntil && defender.defendUntil > Date.now() ? 15 : 0;
  const attackPower = Math.floor(commit * 0.9 + attacker.population * 0.08);
  const defensePower = Math.floor(
    defender.troops * 0.28 + countOwned(world, defender.slot) * 0.35 + terrainBonus + defPost + defendBuff
  );

  world.battle = {
    cx,
    cy,
    attackerId: nationId,
    defenderId: defender.id,
    atkTroops: attackPower,
    defTroops: defensePower,
    progress: Math.min(1, attackPower / Math.max(1, attackPower + defensePower)),
    until: Date.now() + 900,
  };

  addFlash(world, cx, cy, "#ffffff", "attack");
  let captured = 0;

  if (attackPower >= defensePower) {
    world.owner[idx(cx, cy)] = attacker.slot;
    captured = 1;
    attacker.troops = Math.max(10, attacker.troops - commit);
    defender.troops = Math.max(0, defender.troops - Math.floor(defensePower * 0.55));
    addFlash(world, cx, cy, attacker.color, "capture");
    addPopup(world, `VICTORY! +${captured} Territory · +340 Gold`, attacker.color);
    attacker.gold += 340;
    if (defender.troops <= 0 && countOwned(world, defender.slot) <= 4) {
      eliminateNation(world, defender.id);
    }
    if (!attacker.isBot && defender.tutorialAggressor) {
      world.pendingCounterAttack = defender.id;
    }
  } else {
    attacker.troops = Math.max(5, attacker.troops - commit);
    defender.troops = Math.max(5, defender.troops - Math.floor(attackPower * 0.25));
    addPopup(world, `Repulsed · lost ${commit} troops`, "#f87171");
  }

  recomputePct(world);
  checkVictory(world);
  return true;
}

export function applyDefend(world: RfWorld, nationId: string): boolean {
  const n = world.nations[nationId];
  if (!n?.alive || world.roundOver) return false;
  n.defendUntil = Date.now() + 8000;
  n.troops = Math.max(5, n.troops - 10);
  addPopup(world, "🛡️ DEFENSE READY — borders fortified", n.color);
  return true;
}

export function applyBuild(
  world: RfWorld,
  cx: number,
  cy: number,
  nationId: string,
  kind: "city" | "defense"
): boolean {
  if (!canBuild(world, cx, cy, nationId, kind)) return false;
  const n = world.nations[nationId]!;
  if (kind === "city") {
    n.gold -= 80;
    world.buildings[idx(cx, cy)] = 1;
    n.population += 25;
    addPopup(world, "🏙️ CITY — Population cap ↑", n.color);
  } else {
    n.gold -= 60;
    world.buildings[idx(cx, cy)] = 2;
    addPopup(world, "🛡️ DEFENSE POST — border strength ↑", n.color);
  }
  addFlash(world, cx, cy, n.color, "build");
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
    let cityBonus = 0;
    for (let i = 0; i < world.buildings.length; i++) {
      if (world.owner[i] === n.slot && world.buildings[i] === 1) cityBonus++;
    }
    n.gold += 3 + cells * 0.18 + cityBonus * 2;
    n.population += 1 + cells * 0.1 + cityBonus * 3;
    n.troops += 3 + cells * 0.08 + n.population * 0.012 + cityBonus;
    n.troops = Math.min(n.troops, 8000);
  }
  recomputePct(world);
  checkVictory(world);
}

function pickAiExpand(world: RfWorld, nationId: string): [number, number] | null {
  const targets = findExpandTargets(world, nationId, 20);
  if (targets.length === 0) return null;
  return [targets[0]!.cx, targets[0]!.cy];
}

function pickAiAttack(world: RfWorld, nationId: string, aggressive: boolean): [number, number] | null {
  const n = world.nations[nationId];
  if (!n?.alive || n.troops < RF_ATTACK_COST * 1.1) return null;
  const chance = aggressive ? 0.55 : 0.22;
  if (Math.random() > chance) return null;
  const candidates: Array<[number, number]> = [];
  for (let cy = 0; cy < RF_GRID; cy++) {
    for (let cx = 0; cx < RF_GRID; cx++) {
      if (canAttack(world, cx, cy, nationId)) candidates.push([cx, cy]);
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

function tickTutorialCounter(world: RfWorld): void {
  if (!world.pendingCounterAttack) return;
  const bot = world.nations[world.pendingCounterAttack];
  if (!bot?.alive) {
    world.pendingCounterAttack = undefined;
    return;
  }
  const human = Object.values(world.nations).find((n) => n.alive && !n.isBot);
  if (!human) return;
  const atk = pickAiAttack(world, bot.id, true);
  if (atk) {
    applyAttack(world, atk[0], atk[1], bot.id, 0.35);
    addPopup(world, "🚨 INCOMING ATTACK! Red Kingdom strikes your border.", "#ef4444", 3500);
    world.pendingCounterAttack = undefined;
  }
}

function tickAi(world: RfWorld): void {
  for (const n of Object.values(world.nations)) {
    if (!n.alive || !n.isBot) continue;
    const p = n.personality ?? "expander";
    if (p === "aggressor") {
      const attack = pickAiAttack(world, n.id, true);
      if (attack) {
        applyAttack(world, attack[0], attack[1], n.id, 0.5);
        continue;
      }
    } else if (p === "turtle") {
      if (n.troops > 200 && Math.random() < 0.08) applyDefend(world, n.id);
      if (n.troops >= RF_EXPAND_COST && Math.random() < 0.25) {
        const expand = pickAiExpand(world, n.id);
        if (expand) applyExpand(world, expand[0], expand[1], n.id);
      }
      continue;
    }
    const attack = pickAiAttack(world, n.id, false);
    if (attack) {
      applyAttack(world, attack[0], attack[1], n.id, 0.4);
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
  if (world.battle && world.battle.until <= now) world.battle = null;

  if (world.tick % Math.round(RF_ECON_MS / RF_TICK_MS) === 0) {
    tickEconomy(world);
  }
  if (world.pendingCounterAttack && world.tick % 5 === 0) {
    tickTutorialCounter(world);
  }
  if (world.tick % 4 === 0) {
    tickAi(world);
  }
}

export function applyRfAction(world: RfWorld, action: RfAction): boolean {
  switch (action.type) {
    case "expand":
      return applyExpand(world, action.cx, action.cy, action.nationId);
    case "attack":
      return applyAttack(world, action.cx, action.cy, action.nationId, action.pct ?? 0.5);
    case "defend":
      return applyDefend(world, action.nationId);
    case "build":
      return applyBuild(world, action.cx, action.cy, action.nationId, action.kind);
    default:
      return false;
  }
}

export function serializeRfState(world: RfWorld): RfSyncState {
  return {
    tick: world.tick,
    econTick: world.econTick,
    roundStartedAt: world.roundStartedAt,
    roundOver: world.roundOver,
    winnerId: world.winnerId,
    owner: Array.from(world.owner),
    terrain: Array.from(world.terrain),
    buildings: Array.from(world.buildings),
    nations: Object.values(world.nations).map((n) => ({ ...n })),
    flashes: world.flashes.map((f) => ({ ...f })),
    popups: world.popups.map((p) => ({ ...p })),
    rankings: world.rankings.slice(),
    battle: world.battle ? { ...world.battle } : null,
    pendingCounterAttack: world.pendingCounterAttack,
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
  world.terrain = new Uint8Array(state.terrain.length ? state.terrain : world.terrain);
  world.buildings = new Uint8Array(state.buildings.length ? state.buildings : world.buildings);
  world.flashes = state.flashes.map((f) => ({ ...f }));
  world.popups = state.popups.map((p) => ({ ...p }));
  world.rankings = state.rankings.slice();
  world.battle = state.battle ? { ...state.battle } : null;
  world.pendingCounterAttack = state.pendingCounterAttack;

  world.slotToId = {};
  world.idToSlot = {};
  for (const n of state.nations) {
    world.nations[n.id] = { ...n };
    world.slotToId[n.slot] = n.id;
    world.idToSlot[n.id] = n.slot;
  }
}

export function restartRfRound(world: RfWorld, localId: string, nickname: string, humans: HumanSeat[]): void {
  Object.assign(world, createRfWorld(localId, nickname, humans));
}

export function cellAt(world: RfWorld, cx: number, cy: number): {
  slot: number;
  nation: RfNation | null;
  terrain: RfTerrain;
  building: RfBuilding;
} {
  if (!inBounds(cx, cy)) return { slot: 0, nation: null, terrain: 0, building: 0 };
  const slot = world.owner[idx(cx, cy)]!;
  const id = slot ? world.slotToId[slot] : undefined;
  return {
    slot,
    nation: id ? (world.nations[id] ?? null) : null,
    terrain: world.terrain[idx(cx, cy)] as RfTerrain,
    building: world.buildings[idx(cx, cy)] as RfBuilding,
  };
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

export function nationCenter(world: RfWorld, nationId: string): { cx: number; cy: number } | null {
  const n = world.nations[nationId];
  if (!n) return null;
  let sx = 0;
  let sy = 0;
  let c = 0;
  for (let cy = 0; cy < RF_GRID; cy++) {
    for (let cx = 0; cx < RF_GRID; cx++) {
      if (world.owner[idx(cx, cy)] === n.slot) {
        sx += cx;
        sy += cy;
        c++;
      }
    }
  }
  if (c === 0) return null;
  return { cx: sx / c, cy: sy / c };
}
