/** Territory War — grid-based territory IO (GAME-DEV-012R). */

export const TW_TICK_MS = 50;
export const TW_ROUND_MS = 4 * 60_000;
export const TW_GRID = 128;
export const TW_CELL = 20;
export const TW_WORLD = TW_GRID * TW_CELL;
export const TW_MAX_PLAYERS = 4;
export const TW_START_RADIUS = 5;
export const TW_BASE_SPEED = 5.2;
export const TW_ACCEL = 0.58;
export const TW_FRICTION = 0.09;
export const TW_STEER_LERP = 0.22;
export const TW_BOOST_MULT = 1.68;
export const TW_BOOST_MS = 3_200;
export const TW_CUTTER_MS = 4_000;
export const TW_SHIELD_MS = 4_000;
export const TW_TRAIL_HIT_RADIUS = 11;
export const TW_SELF_TRAIL_SKIP_DIST = 360;
export const TW_SELF_TRAIL_MIN_POINTS = 64;
export const TW_SELF_TRAIL_MIN_CELLS = 22;
export const TW_CUTTER_HIT_MULT = 1.72;
export const TW_CHARGE_PER_CELL = 0.48;
export const TW_TRAIL_DANGER_CELLS = 16;
export const TW_HUNTER_CUT_RANGE = 150;
export const TW_HUNTER_CHASE_RANGE = 520;
export const TW_ABILITY_READY = 100;
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
  | "mega_claim"
  | "trail_cut"
  | "boost_ready"
  | "shield_block"
  | "rank1"
  | "boost"
  | "cutter"
  | "shield"
  | "cutter_ready"
  | "shield_ready";

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
  aimDx: number;
  aimDy: number;
  hasAim: boolean;
  alive: boolean;
  score: number;
  knockouts: number;
  territoryPct: number;
  cellCount: number;
  sizeTier: 0 | 1 | 2;
  outside: boolean;
  trail: number[];
  trailPoints: Array<{ x: number; y: number }>;
  boostUntil: number;
  cutterUntil: number;
  shieldUntil: number;
  shieldCharges: number;
  boostCharge: number;
  cutterCharge: number;
  shieldCharge: number;
  isBot?: boolean;
  botRole?: BotRole;
  place?: number;
  feedback?: TwFeedback;
  spawnX: number;
  spawnY: number;
  deathCause?: "self" | "enemy";
  killerNickname?: string;
  claimFlashUntil?: number;
  claimFlashPct?: number;
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
  ability?: "boost" | "cutter" | "shield";
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
  const botRoles: BotRole[] = ["hunter", "expander", "defender", "hunter"];
  let botN = 0;
  list.forEach((h, i) => {
    const existing = world.players[h.id];
    const sp = spawns[i]!;
    const botRole = h.id.startsWith("bot:") ? botRoles[botN++ % botRoles.length]! : undefined;
    if (existing) {
      existing.nickname = h.nickname;
      existing.isBot = h.id.startsWith("bot:");
      if (h.color) existing.color = h.color;
      if (existing.isBot) existing.botRole = botRole;
      if (existing.isBot && existing.botRole === "hunter" && (existing.cutterCharge ?? 0) < 40) {
        existing.cutterCharge = TW_ABILITY_READY * 0.82;
      }
      existing.trailPoints = existing.trailPoints ?? [];
      existing.aimDx = existing.aimDx ?? 1;
      existing.aimDy = existing.aimDy ?? 0;
      existing.hasAim = existing.hasAim ?? false;
      existing.boostCharge = existing.boostCharge ?? 0;
      existing.cutterCharge = existing.cutterCharge ?? 0;
      existing.shieldCharge = existing.shieldCharge ?? 0;
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
      aimDx: 1,
      aimDy: 0,
      hasAim: false,
      alive: true,
      score: 0,
      knockouts: 0,
      territoryPct: 0,
      cellCount: 0,
      sizeTier: 0,
      outside: false,
      trail: [],
      trailPoints: [],
      boostUntil: 0,
      cutterUntil: 0,
      shieldUntil: 0,
      shieldCharges: 0,
      boostCharge: 0,
      cutterCharge: 0,
      shieldCharge: 0,
      isBot: h.id.startsWith("bot:"),
      botRole,
      spawnX: sp.x,
      spawnY: sp.y,
    };
    const created = world.players[h.id]!;
    if (created.isBot && created.botRole === "hunter") {
      created.cutterCharge = TW_ABILITY_READY * 0.82;
      created.boostCharge = TW_ABILITY_READY * 0.48;
    }
    recountPlayer(world, created);
  });
}

function spawnInitialItems(_world: TerritoryWorld): void {
  /* Abilities charge from territory — no map pickups (GAME-DEV-012R-FIX). */
}

function clearPlayerTrail(world: TerritoryWorld, p: TwPlayer): void {
  for (const t of p.trail) {
    if (world.trail[t] === p.slot) world.trail[t] = 0;
  }
  p.trail = [];
  p.trailPoints = [];
  p.outside = false;
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 0.001) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function trailSegmentHit(
  px: number,
  py: number,
  hitR: number,
  points: Array<{ x: number; y: number }>,
  skipLast = 4
): boolean {
  if (points.length < 2) return false;
  const end = Math.max(1, points.length - skipLast);
  for (let i = 1; i < end; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (distToSegment(px, py, a.x, a.y, b.x, b.y) < hitR) return true;
  }
  return false;
}

/** Self-trail KO: skip recent path by distance so 90° turns don't instant-kill. */
function trailSelfHit(
  px: number,
  py: number,
  hitR: number,
  points: Array<{ x: number; y: number }>,
  skipDist: number
): boolean {
  if (points.length < 12) return false;
  let distFromEnd = 0;
  for (let i = points.length - 1; i >= 1; i--) {
    const tip = points[i]!;
    const prev = points[i - 1]!;
    const segLen = Math.hypot(tip.x - prev.x, tip.y - prev.y);
    if (distFromEnd + segLen <= skipDist) {
      distFromEnd += segLen;
      continue;
    }
    if (distToSegment(px, py, prev.x, prev.y, tip.x, tip.y) < hitR) return true;
  }
  return false;
}

function addAbilityCharge(p: TwPlayer, claimed: number): void {
  const gain = claimed * TW_CHARGE_PER_CELL;
  const oldBoost = p.boostCharge;
  const oldCutter = p.cutterCharge;
  const oldShield = p.shieldCharge;
  p.boostCharge = Math.min(TW_ABILITY_READY, p.boostCharge + gain * 0.58);
  p.cutterCharge = Math.min(TW_ABILITY_READY, p.cutterCharge + gain * 0.24);
  p.shieldCharge = Math.min(TW_ABILITY_READY, p.shieldCharge + gain * 0.24);
  if (oldBoost < TW_ABILITY_READY && p.boostCharge >= TW_ABILITY_READY) {
    p.feedback = { kind: "boost_ready", text: "BOOST READY!", x: p.x, y: p.y };
  } else if (oldCutter < TW_ABILITY_READY && p.cutterCharge >= TW_ABILITY_READY) {
    p.feedback = { kind: "cutter_ready", text: "CUTTER READY!", x: p.x, y: p.y };
  } else if (oldShield < TW_ABILITY_READY && p.shieldCharge >= TW_ABILITY_READY) {
    p.feedback = { kind: "shield_ready", text: "SHIELD READY!", x: p.x, y: p.y };
  }
}

function tryActivateAbility(
  p: TwPlayer,
  ability: "boost" | "cutter" | "shield",
  now: number
): void {
  if (ability === "boost" && p.boostCharge >= TW_ABILITY_READY && now >= p.boostUntil) {
    p.boostCharge = 0;
    p.boostUntil = now + TW_BOOST_MS;
    p.feedback = { kind: "boost", text: "BOOST!", x: p.x, y: p.y };
  } else if (ability === "cutter" && p.cutterCharge >= TW_ABILITY_READY && now >= p.cutterUntil) {
    p.cutterCharge = 0;
    p.cutterUntil = now + TW_CUTTER_MS;
    p.feedback = { kind: "cutter", text: "CUTTER!", x: p.x, y: p.y };
  } else if (ability === "shield" && p.shieldCharge >= TW_ABILITY_READY && p.shieldCharges === 0) {
    p.shieldCharge = 0;
    p.shieldUntil = now + TW_SHIELD_MS;
    p.shieldCharges = 1;
    p.feedback = { kind: "shield", text: "SHIELD!", x: p.x, y: p.y };
  }
}

function applyMovementPhysics(p: TwPlayer, now: number): void {
  const maxSpeed = TW_BASE_SPEED * (now < p.boostUntil ? TW_BOOST_MULT : 1);
  if (p.hasAim) {
    const targetVx = p.aimDx * maxSpeed;
    const targetVy = p.aimDy * maxSpeed;
    p.vx += (targetVx - p.vx) * TW_STEER_LERP;
    p.vy += (targetVy - p.vy) * TW_STEER_LERP;
  } else {
    p.vx *= 1 - TW_FRICTION;
    p.vy *= 1 - TW_FRICTION;
  }
  const spd = Math.hypot(p.vx, p.vy);
  if (spd > maxSpeed) {
    p.vx = (p.vx / spd) * maxSpeed;
    p.vy = (p.vy / spd) * maxSpeed;
  }
  if (spd < 0.05 && !p.hasAim) {
    p.vx = 0;
    p.vy = 0;
  }
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
  addAbilityCharge(p, claimed);

  p.claimFlashUntil = Date.now() + 700;
  p.claimFlashPct = pctGain;

  if (claimed >= 120) {
    p.feedback = { kind: "mega_claim", text: "MEGA CLAIM!", x: p.x, y: p.y };
  } else if (claimed >= 40) {
    p.feedback = { kind: "big_claim", text: "BIG CLAIM!", x: p.x, y: p.y };
  } else if (pctGain >= 0.25) {
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
  if (killer && killer.id !== victim.id) {
    killer.knockouts += 1;
    killer.score += TW_SCORE_CUT;
    killer.feedback = { kind: "cut", text: "CUT! +250", x: killer.x, y: killer.y };
    victim.deathCause = "enemy";
    victim.killerNickname = killer.nickname;
    victim.feedback = {
      kind: "ko",
      text: `CUT BY ${killer.nickname.slice(0, 8).toUpperCase()}!`,
      x: victim.x,
      y: victim.y,
    };
  } else {
    victim.deathCause = "self";
    victim.killerNickname = undefined;
    victim.feedback = { kind: "trail_cut", text: "HIT YOUR TRAIL!", x: victim.x, y: victim.y };
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
  for (const attacker of Object.values(world.players)) {
    if (!attacker.alive) continue;
    const atkR = playerVisualRadius(attacker);
    const cutMult = now < attacker.cutterUntil ? TW_CUTTER_HIT_MULT : 1;
    const hitR = atkR + TW_TRAIL_HIT_RADIUS * cutMult;

    for (const victim of Object.values(world.players)) {
      if (!victim.alive || victim.id === attacker.id) continue;
      if (!victim.outside || victim.trailPoints.length < 2) continue;
      if (!trailSegmentHit(attacker.x, attacker.y, hitR, victim.trailPoints)) continue;

      if (victim.shieldCharges > 0 && now < victim.shieldUntil) {
        victim.shieldCharges = 0;
        victim.feedback = { kind: "shield_block", text: "SHIELD BLOCK", x: victim.x, y: victim.y };
        continue;
      }
      killPlayer(world, victim, attacker);
    }

    if (
      attacker.outside &&
      attacker.trail.length > TW_SELF_TRAIL_MIN_CELLS &&
      attacker.trailPoints.length > TW_SELF_TRAIL_MIN_POINTS
    ) {
      const selfR = atkR + TW_TRAIL_HIT_RADIUS * 0.5;
      if (
        trailSelfHit(
          attacker.x,
          attacker.y,
          selfR,
          attacker.trailPoints,
          TW_SELF_TRAIL_SKIP_DIST
        )
      ) {
        killPlayer(world, attacker, null);
      }
    }
  }
}

function appendTrailPoint(p: TwPlayer): void {
  const last = p.trailPoints[p.trailPoints.length - 1];
  if (last && Math.hypot(last.x - p.x, last.y - p.y) < 3.5) return;
  p.trailPoints.push({ x: p.x, y: p.y });
  if (p.trailPoints.length > 240) p.trailPoints.shift();
}

function addTrailCell(world: TerritoryWorld, p: TwPlayer, cellI: number): void {
  if (world.owner[cellI] === p.slot) return;
  if (world.trail[cellI] === p.slot) return;
  world.trail[cellI] = p.slot;
  p.trail.push(cellI);
  appendTrailPoint(p);
  p.outside = true;
  if (p.trail.length >= TW_TRAIL_DANGER_CELLS && world.tick % 8 === 0) {
    p.feedback = { kind: "danger", text: "TRAIL DANGER!", x: p.x, y: p.y };
  }
}

export function applyTwInput(world: TerritoryWorld, input: TwInput, now = Date.now()): void {
  const p = world.players[input.deviceId];
  if (!p || !p.alive || world.roundOver) return;

  const dx = input.dx;
  const dy = input.dy;
  const len = Math.hypot(dx, dy);
  if (len > 0.01) {
    p.aimDx = dx / len;
    p.aimDy = dy / len;
    p.hasAim = true;
  } else {
    p.hasAim = false;
  }

  const ability = input.ability ?? (input.boost ? "boost" : undefined);
  if (ability) tryActivateAbility(p, ability, now);
}

function botThink(world: TerritoryWorld, bot: TwPlayer, now: number): void {
  if (!bot.alive || world.roundOver) return;
  const role = bot.botRole ?? "expander";
  if (world.tick % 2 !== 0 && role !== "hunter") return;
  let dx = 0;
  let dy = 0;

  if (role === "hunter") {
    let target: TwPlayer | null = null;
    let best = Infinity;
    let aimX = 0;
    let aimY = 0;
    for (const p of Object.values(world.players)) {
      if (!p.alive || p.id === bot.id || p.isBot) continue;
      const playerDist = Math.hypot(p.x - bot.x, p.y - bot.y);
      if (playerDist > TW_HUNTER_CHASE_RANGE && !p.outside) continue;
      if (p.trailPoints.length >= 2) {
        for (const tp of p.trailPoints) {
          const d = Math.hypot(tp.x - bot.x, tp.y - bot.y);
          if (d < best && d <= TW_HUNTER_CHASE_RANGE) {
            best = d;
            target = p;
            aimX = tp.x;
            aimY = tp.y;
          }
        }
      }
      if (!target && p.outside && playerDist < TW_HUNTER_CHASE_RANGE) {
        if (playerDist < best) {
          best = playerDist;
          target = p;
          aimX = p.x;
          aimY = p.y;
        }
      }
    }
    if (target) {
      dx = aimX - bot.x;
      dy = aimY - bot.y;
      const preyTrailLong = target.trail.length >= 24;
      const cutRange = TW_HUNTER_CUT_RANGE + (preyTrailLong ? 50 : 20);
      const cutCharge = TW_ABILITY_READY * (preyTrailLong ? 0.78 : 0.88);
      if (best < cutRange && bot.cutterCharge >= cutCharge) {
        tryActivateAbility(bot, "cutter", now);
      } else if (
        bot.boostCharge >= TW_ABILITY_READY * (preyTrailLong ? 0.55 : 1) &&
        best > 70 &&
        best < TW_HUNTER_CHASE_RANGE + (preyTrailLong ? 120 : 0)
      ) {
        tryActivateAbility(bot, "boost", now);
      }
    } else {
      const ang = (world.tick / 18 + bot.slot) * 0.18;
      dx = Math.cos(ang) * 50;
      dy = Math.sin(ang) * 50;
    }
  }

  if (role === "defender" || (dx === 0 && dy === 0 && role !== "expander")) {
    let nearestHuman: TwPlayer | null = null;
    let nearD = Infinity;
    for (const p of Object.values(world.players)) {
      if (!p.alive || p.id === bot.id || p.isBot) continue;
      const d = Math.hypot(p.x - bot.x, p.y - bot.y);
      if (d < nearD) {
        nearD = d;
        nearestHuman = p;
      }
    }
    if (nearestHuman && nearD < 420) {
      dx = nearestHuman.x - bot.x;
      dy = nearestHuman.y - bot.y;
    } else {
      const ang = (world.tick / 20 + bot.slot) * 0.15;
      dx = Math.cos(ang) * (bot.spawnX - bot.x) + Math.cos(ang + 1.2) * 40;
      dy = Math.sin(ang) * (bot.spawnY - bot.y) + Math.sin(ang + 1.2) * 40;
    }
  }

  if (role === "expander" && dx === 0 && dy === 0) {
    const ang = (world.tick / 15 + bot.slot * 1.7) * 0.2;
    dx = Math.cos(ang) * 60;
    dy = Math.sin(ang) * 60;
    if (bot.outside && bot.trail.length > 20) {
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

    applyMovementPhysics(p, now);

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
      if (p.outside) appendTrailPoint(p);
    }

    recountPlayer(world, p);
  }

  checkTrailCollisions(world, now);

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
      trailPoints: p.trailPoints.slice(-80),
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
    world.players[p.id] = {
      ...p,
      trail: p.trail.slice(),
      trailPoints: p.trailPoints?.slice() ?? [],
      aimDx: p.aimDx ?? 1,
      aimDy: p.aimDy ?? 0,
      hasAim: p.hasAim ?? false,
      boostCharge: p.boostCharge ?? 0,
      cutterCharge: p.cutterCharge ?? 0,
      shieldCharge: p.shieldCharge ?? 0,
    };
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
