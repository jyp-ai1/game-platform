/** PUSH ARENA — 2~4P knockback arena prototype (GAME-DEV-012). */

export const PUSH_ARENA_TICK_MS = 50;
export const PUSH_ARENA_ROUND_MS = 75_000;
export const ARENA_RADIUS = 260;
export const SAFE_ZONE_RADIUS = 70;
export const PLAYER_RADIUS = 16;
export const MAX_PLAYERS = 4;

export const BASE_SPEED = 3.4;
export const BOOST_SPEED_MULT = 1.55;
export const BOOST_DURATION_MS = 4_000;
export const SHIELD_DURATION_MS = 5_000;
export const SCORE_KNOCKOUT = 100;
export const SCORE_SURVIVAL_PER_SEC = 2;

export type ItemKind = "boost" | "push" | "shield";

export type PushFeedbackKind = "push" | "knockout" | "boost" | "shield" | "item";

export type PushFeedback = {
  kind: PushFeedbackKind;
  x: number;
  y: number;
};

export type PushArenaPlayer = {
  id: string;
  nickname: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  score: number;
  knockouts: number;
  aliveSince: number;
  boostUntil: number;
  pushReady: boolean;
  shieldUntil: number;
  isBot?: boolean;
  place?: number;
  feedback?: PushFeedback;
};

export type PushArenaItem = {
  id: string;
  kind: ItemKind;
  x: number;
  y: number;
};

export type PushArenaWorld = {
  tick: number;
  roundStartedAt: number;
  roundOver: boolean;
  winnerId: string | null;
  players: Record<string, PushArenaPlayer>;
  items: PushArenaItem[];
  rankings: Array<{ id: string; nickname: string; score: number; knockouts: number }>;
};

export type PushArenaInput = {
  deviceId: string;
  dx: number;
  dy: number;
  boost?: boolean;
  push?: boolean;
  at?: number;
};

export type PushArenaSyncState = {
  tick: number;
  roundStartedAt: number;
  roundOver: boolean;
  winnerId: string | null;
  players: PushArenaPlayer[];
  items: PushArenaItem[];
};

const COLORS = ["#22d3ee", "#f472b6", "#fbbf24", "#34d399"];

export type HumanSeat = { id: string; nickname: string; color?: string };

function dist(x: number, y: number): number {
  return Math.hypot(x, y);
}

function clampInsideArena(p: PushArenaPlayer): void {
  const d = dist(p.x, p.y);
  const maxR = ARENA_RADIUS - PLAYER_RADIUS - 2;
  if (d > maxR && d > 0.001) {
    const s = maxR / d;
    p.x *= s;
    p.y *= s;
  }
}

function spawnAngle(index: number, total: number): { x: number; y: number } {
  const ang = (index / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
  const r = 120;
  return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
}

export function createPushArenaWorld(
  localId: string,
  nickname: string,
  humans: HumanSeat[] = [{ id: localId, nickname }]
): PushArenaWorld {
  const now = Date.now();
  const world: PushArenaWorld = {
    tick: 0,
    roundStartedAt: now,
    roundOver: false,
    winnerId: null,
    players: {},
    items: [],
    rankings: [],
  };
  reconcileHumans(world, humans.slice(0, MAX_PLAYERS));
  spawnInitialItems(world);
  updateRankings(world);
  return world;
}

export function reconcileHumans(world: PushArenaWorld, humans: HumanSeat[]): void {
  const want = Math.min(MAX_PLAYERS, Math.max(2, humans.length));
  let list = humans.slice(0, MAX_PLAYERS);
  while (list.length < want) {
    const idx = list.length;
    list.push({ id: `bot:${idx}`, nickname: `Bot${idx + 1}` });
  }

  const keep = new Set(list.map((h) => h.id));
  for (const id of Object.keys(world.players)) {
    if (!keep.has(id)) delete world.players[id];
  }

  list.forEach((h, i) => {
    const existing = world.players[h.id];
    const pos = spawnAngle(i, list.length);
    if (existing) {
      existing.nickname = h.nickname;
      existing.isBot = h.id.startsWith("bot:");
      if (h.color) existing.color = h.color;
      if (!existing.alive && world.roundOver) {
        /* keep dead state until rematch */
      }
      return;
    }
    world.players[h.id] = {
      id: h.id,
      nickname: h.nickname,
      color: h.color || COLORS[i % COLORS.length]!,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      alive: true,
      score: 0,
      knockouts: 0,
      aliveSince: Date.now(),
      boostUntil: 0,
      pushReady: false,
      shieldUntil: 0,
      isBot: h.id.startsWith("bot:"),
    };
  });
}

function spawnInitialItems(world: PushArenaWorld): void {
  const kinds: ItemKind[] = ["boost", "push", "shield"];
  for (let i = 0; i < 3; i++) {
    world.items.push(randomItem(world, kinds[i % 3]!));
  }
}

function randomItem(world: PushArenaWorld, kind?: ItemKind): PushArenaItem {
  const kinds: ItemKind[] = ["boost", "push", "shield"];
  const k = kind ?? kinds[(world.tick + world.items.length) % kinds.length]!;
  const r = 40 + ((world.tick * 17 + world.items.length * 31) % 140);
  const ang = ((world.tick * 13 + world.items.length * 7) % 360) * (Math.PI / 180);
  return {
    id: `item-${world.tick}-${world.items.length}-${k}`,
    kind: k,
    x: Math.cos(ang) * r,
    y: Math.sin(ang) * r,
  };
}

export function applyPushArenaInput(world: PushArenaWorld, input: PushArenaInput, now = Date.now()): void {
  const p = world.players[input.deviceId];
  if (!p || !p.alive || world.roundOver) return;

  let dx = input.dx;
  let dy = input.dy;
  const len = Math.hypot(dx, dy);
  if (len > 0.01) {
    dx /= len;
    dy /= len;
  }

  const boosting = now < p.boostUntil || input.boost;
  const speed = BASE_SPEED * (boosting ? BOOST_SPEED_MULT : 1);
  p.vx = dx * speed;
  p.vy = dy * speed;

  if (input.push && p.pushReady) {
    p.pushReady = true;
  }
}

function pickupItems(world: PushArenaWorld, p: PushArenaPlayer, now: number): void {
  const idx = world.items.findIndex((it) => Math.hypot(it.x - p.x, it.y - p.y) < PLAYER_RADIUS + 14);
  if (idx < 0) return;
  const item = world.items[idx]!;
  world.items.splice(idx, 1);

  if (item.kind === "boost") {
    p.boostUntil = now + BOOST_DURATION_MS;
    p.feedback = { kind: "boost", x: p.x, y: p.y };
  } else if (item.kind === "push") {
    p.pushReady = true;
    p.feedback = { kind: "push", x: p.x, y: p.y };
  } else if (item.kind === "shield") {
    p.shieldUntil = now + SHIELD_DURATION_MS;
    p.feedback = { kind: "shield", x: p.x, y: p.y };
  }
  p.score += 10;
}

function resolveCollisions(world: PushArenaWorld, now: number): void {
  const alive = Object.values(world.players).filter((p) => p.alive);
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i]!;
      const b = alive[j]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const minD = PLAYER_RADIUS * 2;
      if (d >= minD || d < 0.001) continue;

      const nx = dx / d;
      const ny = dy / d;
      const overlap = (minD - d) / 2;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;

      const aSpeed = Math.hypot(a.vx, a.vy);
      const bSpeed = Math.hypot(b.vx, b.vy);
      const aTowardB = a.vx * nx + a.vy * ny;
      const bTowardA = b.vx * -nx + b.vy * -ny;

      let pushA = 0;
      let pushB = 0;

      if (aTowardB > bTowardA) {
        pushB = 2.2 + aSpeed * 0.35 + (a.pushReady ? 2.8 : 0) + (now < a.boostUntil ? 0.8 : 0);
        if (now < b.shieldUntil) pushB *= 0.15;
        b.vx += nx * pushB;
        b.vy += ny * pushB;
        a.vx -= nx * pushB * 0.25;
        a.vy -= ny * pushB * 0.25;
        if (a.pushReady) {
          a.pushReady = false;
          a.feedback = { kind: "push", x: a.x, y: a.y };
        }
      } else if (bTowardA > aTowardB) {
        pushA = 2.2 + bSpeed * 0.35 + (b.pushReady ? 2.8 : 0) + (now < b.boostUntil ? 0.8 : 0);
        if (now < a.shieldUntil) pushA *= 0.15;
        a.vx -= nx * pushA;
        a.vy -= ny * pushA;
        b.vx += nx * pushA * 0.25;
        b.vy += ny * pushA * 0.25;
        if (b.pushReady) {
          b.pushReady = false;
          b.feedback = { kind: "push", x: b.x, y: b.y };
        }
      } else {
        const push = 1.4 + (aSpeed + bSpeed) * 0.15;
        a.vx -= nx * push;
        a.vy -= ny * push;
        b.vx += nx * push;
        b.vy += ny * push;
      }
    }
  }
}

function checkFallOff(world: PushArenaWorld, now: number): void {
  for (const p of Object.values(world.players)) {
    if (!p.alive) continue;
    if (dist(p.x, p.y) <= ARENA_RADIUS - PLAYER_RADIUS) continue;

    p.alive = false;
    p.feedback = { kind: "knockout", x: p.x, y: p.y };

    let bestAttacker: PushArenaPlayer | null = null;
    let bestToward = 0;
    for (const other of Object.values(world.players)) {
      if (!other.alive || other.id === p.id) continue;
      const dx = p.x - other.x;
      const dy = p.y - other.y;
      const d = Math.hypot(dx, dy);
      if (d > PLAYER_RADIUS * 4) continue;
      const toward = (other.vx * dx + other.vy * dy) / Math.max(d, 1);
      if (toward > bestToward) {
        bestToward = toward;
        bestAttacker = other;
      }
    }
    if (bestAttacker) {
      bestAttacker.knockouts += 1;
      bestAttacker.score += SCORE_KNOCKOUT;
      bestAttacker.feedback = { kind: "knockout", x: bestAttacker.x, y: bestAttacker.y };
    }
  }
}

function botThink(world: PushArenaWorld, bot: PushArenaPlayer, now: number): void {
  if (!bot.alive || world.roundOver) return;
  if (world.tick % 4 !== 0) return;

  const humans = Object.values(world.players).filter((p) => p.alive && !p.isBot);
  const target = humans[0] ?? Object.values(world.players).find((p) => p.alive && p.id !== bot.id);
  if (!target) return;

  let dx = target.x - bot.x;
  let dy = target.y - bot.y;
  const d = Math.hypot(dx, dy);
  if (d > 0.01) {
    dx /= d;
    dy /= d;
  }

  const edgeDist = ARENA_RADIUS - dist(bot.x, bot.y);
  if (edgeDist < 60) {
    dx = -bot.x / Math.max(dist(bot.x, bot.y), 1);
    dy = -bot.y / Math.max(dist(bot.x, bot.y), 1);
  }

  const nearItem = world.items.find((it) => Math.hypot(it.x - bot.x, it.y - bot.y) < 80);
  if (nearItem && !bot.pushReady) {
    dx = nearItem.x - bot.x;
    dy = nearItem.y - bot.y;
    const id = Math.hypot(dx, dy);
    if (id > 0.01) {
      dx /= id;
      dy /= id;
    }
  }

  applyPushArenaInput(world, { deviceId: bot.id, dx, dy, boost: edgeDist > 100 && d < 90, at: now });
}

function finalizeRound(world: PushArenaWorld): void {
  if (world.roundOver) return;
  world.roundOver = true;

  const sorted = Object.values(world.players).sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    return b.score - a.score;
  });

  let place = 1;
  for (const p of sorted) {
    p.place = place;
    place += 1;
  }

  world.winnerId = sorted[0]?.id ?? null;
  updateRankings(world);
}

export function tickPushArenaWorld(world: PushArenaWorld, now = Date.now(), opts?: { skipBots?: boolean }): void {
  if (world.roundOver) return;
  world.tick += 1;

  const elapsed = now - world.roundStartedAt;
  if (elapsed >= PUSH_ARENA_ROUND_MS) {
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
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.88;
    p.vy *= 0.88;
    clampInsideArena(p);
    pickupItems(world, p, now);
    if (p.alive) {
      p.score += SCORE_SURVIVAL_PER_SEC / (1000 / PUSH_ARENA_TICK_MS);
    }
  }

  resolveCollisions(world, now);
  checkFallOff(world, now);

  if (world.tick % 160 === 0 && world.items.length < 5) {
    world.items.push(randomItem(world));
  }

  const alive = Object.values(world.players).filter((p) => p.alive);
  if (alive.length <= 1 && Object.keys(world.players).length >= 2) {
    finalizeRound(world);
    return;
  }

  updateRankings(world);
}

export function updateRankings(world: PushArenaWorld): void {
  world.rankings = Object.values(world.players)
    .sort((a, b) => b.score - a.score || b.knockouts - a.knockouts)
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: Math.round(p.score),
      knockouts: p.knockouts,
    }));
}

export function serializePushArenaState(world: PushArenaWorld): PushArenaSyncState {
  return {
    tick: world.tick,
    roundStartedAt: world.roundStartedAt,
    roundOver: world.roundOver,
    winnerId: world.winnerId,
    players: Object.values(world.players).map((p) => ({ ...p })),
    items: world.items.map((i) => ({ ...i })),
  };
}

export type ApplyPushArenaSyncOpts = {
  rejectStaleTick?: boolean;
};

export function applyPushArenaSyncState(
  world: PushArenaWorld,
  state: PushArenaSyncState,
  opts?: ApplyPushArenaSyncOpts
): boolean {
  if (opts?.rejectStaleTick && state.tick < world.tick) return false;

  world.tick = state.tick;
  world.roundStartedAt = state.roundStartedAt;
  world.roundOver = state.roundOver;
  world.winnerId = state.winnerId;
  world.items = state.items.map((i) => ({ ...i }));
  world.players = {};
  for (const p of state.players) {
    world.players[p.id] = { ...p };
  }
  updateRankings(world);
  return true;
}

export function restartPushArenaRound(world: PushArenaWorld, humans: HumanSeat[]): PushArenaWorld {
  const next = createPushArenaWorld(humans[0]?.id ?? "host", humans[0]?.nickname ?? "Host", humans);
  for (const h of humans) {
    const p = next.players[h.id];
    if (p && h.color) p.color = h.color;
  }
  return next;
}

export function remainingRoundSec(world: PushArenaWorld, now = Date.now()): number {
  const left = PUSH_ARENA_ROUND_MS - (now - world.roundStartedAt);
  return Math.max(0, Math.ceil(left / 1000));
}
