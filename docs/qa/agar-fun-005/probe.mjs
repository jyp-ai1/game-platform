/**
 * AGAR-FUN-005 — collision→result latency (ms) + overlap duration.
 * Run: npx tsx docs/qa/agar-fun-005/probe.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createAgarWorld,
  tickAgarWorld,
  splitPlayer,
  ejectMass,
  massToRadius,
  circlesContact,
  updateRankings,
  AGAR_TICK_MS,
  AGAR_COLLIDE_EPS,
  AGAR_START_MASS,
  AGAR_VIRUS_POP_MIN,
  AGAR_VIRUS_MASS,
  AGAR_WORLD,
  AGAR_FOOD_TARGET,
  AGAR_MIN_SPLIT_MASS,
  AGAR_VIRUS_TARGET,
} from "../../../games/agar/src/agar-io-engine.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function wipeBots(w) {
  for (const p of Object.values(w.players)) {
    if (p.isBot) {
      p.alive = false;
      p.cells = [];
    }
  }
}

function placeCell(p, x, y, mass) {
  p.alive = true;
  p.cells = [{ x, y, mass }];
  p.aimX = x;
  p.aimY = y;
}

function visualOverlap(a, b) {
  if (!a || !b) return false;
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  return d < massToRadius(a.mass) + massToRadius(b.mass);
}

/** Isolated arena — bots/food cleared; viruses parked far so tick regen won't refill into lane. */
function arena(id = "player:qa") {
  const w = createAgarWorld(id, "QA", "normal");
  wipeBots(w);
  w.food = [];
  w.viruses = [];
  for (let i = 0; i < AGAR_VIRUS_TARGET; i++) {
    w.viruses.push({ id: `park-${i}`, x: 40 + (i % 5) * 8, y: 40 + Math.floor(i / 5) * 8, mass: AGAR_VIRUS_MASS });
  }
  return { id, w, me: w.players[id] };
}

function measureApproach(opts) {
  const { hunterMass, preyMass, mode } = opts;
  const { id, w, me } = arena();
  const preyId = "bot:prey";
  w.players[preyId] = {
    id: preyId,
    nickname: "Prey",
    color: "#f472b6",
    alive: true,
    isBot: false,
    cells: [{ x: 400, y: 400, mass: preyMass }],
    aimX: 400,
    aimY: 400,
    score: 0,
    lastSplitAt: 0,
  };
  const prey = w.players[preyId];

  const hr0 = massToRadius(hunterMass);
  const pr0 = massToRadius(preyMass);
  const gap = hr0 + pr0 + 48;
  const cx = 400;
  const cy = 400;

  if (mode === "head-on") {
    placeCell(me, cx - gap / 2, cy, hunterMass);
    placeCell(prey, cx + gap / 2, cy, preyMass);
    me.aimX = cx + gap;
    me.aimY = cy;
    prey.aimX = cx - gap;
    prey.aimY = cy;
  } else {
    placeCell(me, cx, cy, hunterMass);
    placeCell(prey, cx + gap, cy, preyMass);
    me.aimX = prey.cells[0].x;
    me.aimY = cy;
    prey.aimX = prey.cells[0].x;
    prey.aimY = cy;
  }

  let firstOverlapTick = -1;
  let resolveTick = -1;
  const startTick = w.tick;

  for (let i = 0; i < 400; i++) {
    if (mode === "chase" && prey.cells[0]) {
      me.aimX = prey.cells[0].x;
      me.aimY = prey.cells[0].y;
      prey.aimX = prey.cells[0].x;
      prey.aimY = prey.cells[0].y;
    }

    const overlappedBefore = visualOverlap(me.cells[0], prey.cells[0]);
    tickAgarWorld(w, Date.now() + i * AGAR_TICK_MS);
    const eaten = !prey.alive || prey.cells.length === 0;

    if (overlappedBefore && firstOverlapTick < 0) firstOverlapTick = w.tick;
    if (!eaten && visualOverlap(me.cells[0], prey.cells[0]) && firstOverlapTick < 0) {
      firstOverlapTick = w.tick;
    }
    if (eaten) {
      resolveTick = w.tick;
      if (firstOverlapTick < 0) firstOverlapTick = w.tick;
      break;
    }
  }

  if (resolveTick < 0) resolveTick = w.tick;
  if (firstOverlapTick < 0) firstOverlapTick = resolveTick;
  const overlapTicks = Math.max(0, resolveTick - firstOverlapTick);
  return {
    mode,
    hunterMass,
    preyMass,
    ticks: resolveTick - startTick,
    overlapTicks,
    latencyMs: overlapTicks * AGAR_TICK_MS,
    overlapMs: overlapTicks * AGAR_TICK_MS,
    resolved: !prey.alive || prey.cells.length === 0,
  };
}

function measureSplitFragment() {
  const { w, me } = arena();
  placeCell(me, 400, 400, 200);
  const preyId = "bot:frag";
  w.players[preyId] = {
    id: preyId,
    nickname: "Frag",
    color: "#a78bfa",
    alive: true,
    isBot: false,
    cells: [{ x: 400 + massToRadius(200) + massToRadius(30) + 55, y: 400, mass: 30 }],
    aimX: 400,
    aimY: 400,
    score: 0,
    lastSplitAt: 0,
  };
  const prey = w.players[preyId];
  prey.aimX = prey.cells[0].x;
  prey.aimY = prey.cells[0].y;

  let firstOverlapTick = -1;
  let resolveTick = -1;
  const start = w.tick;
  for (let i = 0; i < 300; i++) {
    if (prey.cells[0]) {
      me.aimX = prey.cells[0].x;
      me.aimY = prey.cells[0].y;
      prey.aimX = prey.cells[0].x;
      prey.aimY = prey.cells[0].y;
    }
    const overlappedBefore = visualOverlap(me.cells[0], prey.cells[0]);
    tickAgarWorld(w, Date.now() + i * AGAR_TICK_MS);
    const eaten = !prey.alive || prey.cells.length === 0;
    if (overlappedBefore && firstOverlapTick < 0) firstOverlapTick = w.tick;
    if (!eaten && visualOverlap(me.cells[0], prey.cells[0]) && firstOverlapTick < 0) {
      firstOverlapTick = w.tick;
    }
    if (eaten) {
      resolveTick = w.tick;
      if (firstOverlapTick < 0) firstOverlapTick = w.tick;
      break;
    }
  }
  if (resolveTick < 0) resolveTick = w.tick;
  if (firstOverlapTick < 0) firstOverlapTick = resolveTick;
  const overlapTicks = Math.max(0, resolveTick - firstOverlapTick);
  return {
    latencyMs: overlapTicks * AGAR_TICK_MS,
    overlapMs: overlapTicks * AGAR_TICK_MS,
    ticks: resolveTick - start,
    resolved: !prey.alive || prey.cells.length === 0,
  };
}

function measureVirus() {
  const { w, me } = arena();
  // Keep virus count at target so regen does not inject path hazards
  w.viruses = [{ id: "v-test", x: 600, y: 400, mass: AGAR_VIRUS_MASS }];
  for (let i = 1; i < AGAR_VIRUS_TARGET; i++) {
    w.viruses.push({
      id: `park-v-${i}`,
      x: 40 + (i % 5) * 8,
      y: 40 + Math.floor(i / 5) * 8,
      mass: AGAR_VIRUS_MASS,
    });
  }
  const mass = AGAR_VIRUS_POP_MIN + 40;
  const cr = massToRadius(mass);
  const vr = massToRadius(AGAR_VIRUS_MASS);
  placeCell(me, 600 - (cr + vr + 55), 400, mass);
  me.aimX = 600;
  me.aimY = 400;

  let firstOverlapTick = -1;
  let resolveTick = -1;
  const cellsBefore = me.cells.length;
  const start = w.tick;
  for (let i = 0; i < 300; i++) {
    const cell = me.cells[0];
    const v = w.viruses.find((x) => x.id === "v-test") ?? w.viruses[0];
    const overlappedBefore =
      cell &&
      v &&
      Math.hypot(cell.x - v.x, cell.y - v.y) < massToRadius(cell.mass) + massToRadius(v.mass);
    const wasSingle = me.cells.length === 1;
    tickAgarWorld(w, Date.now() + i * AGAR_TICK_MS);
    const popped = wasSingle && me.cells.length > 1;
    if (overlappedBefore && firstOverlapTick < 0) firstOverlapTick = w.tick;
    if (popped) {
      resolveTick = w.tick;
      if (firstOverlapTick < 0) firstOverlapTick = w.tick;
      break;
    }
  }
  if (resolveTick < 0) resolveTick = w.tick;
  if (firstOverlapTick < 0) firstOverlapTick = resolveTick;
  const overlapTicks = Math.max(0, resolveTick - firstOverlapTick);
  return {
    latencyMs: overlapTicks * AGAR_TICK_MS,
    overlapMs: overlapTicks * AGAR_TICK_MS,
    cellsBefore,
    cellsAfter: me.cells.length,
    popped: me.cells.length > 1,
    ticks: resolveTick - start,
  };
}

function legacyChaseEstimate() {
  const hr = massToRadius(180);
  const pr = massToRadius(80);
  const close = hr + pr - (hr - pr * 0.28);
  const relSpeed = 0.45;
  const ticks = Math.ceil(close / relSpeed);
  return { closeWu: Math.round(close * 10) / 10, ticks, ms: ticks * AGAR_TICK_MS };
}

const headOn = measureApproach({ hunterMass: 160, preyMass: 70, mode: "head-on" });
const chase = measureApproach({ hunterMass: 180, preyMass: 80, mode: "chase" });
const smallEaten = measureApproach({ hunterMass: 200, preyMass: 40, mode: "chase" });
const largeEats = measureApproach({ hunterMass: 220, preyMass: 90, mode: "head-on" });
const split = measureSplitFragment();
const virus = measureVirus();
const legacyEst = legacyChaseEstimate();

const theory = {
  contactCloseWu: AGAR_COLLIDE_EPS,
  legacyCloseWu: Math.round((massToRadius(80) + massToRadius(80) * 0.28) * 10) / 10,
  legacyChase: legacyEst,
};

const reg = {};
{
  const { id, w, me } = arena();
  // Restore viruses for virus-existence check
  const full = createAgarWorld("player:reg", "QA", "normal");
  reg.growth =
    AGAR_WORLD === 1800 &&
    AGAR_FOOD_TARGET === 360 &&
    AGAR_START_MASS === 28 &&
    me.cells[0].mass === AGAR_START_MASS;
  placeCell(me, 500, 500, Math.max(AGAR_MIN_SPLIT_MASS * 2, 120));
  const before = me.cells.length;
  splitPlayer(w, id, Date.now());
  reg.space = me.cells.length > before;
  const foodBefore = w.food.length;
  placeCell(me, 500, 500, 80);
  me.aimX = 600;
  ejectMass(w, id);
  reg.w = w.food.length > foodBefore && w.food.some((f) => f.kind === "eject");
  reg.virus = full.viruses.length > 0 && virus.popped;
  updateRankings(w);
  reg.top10 = w.rankings.length > 0 && w.rankings.length <= 10;
  reg.minimap = w.size === AGAR_WORLD && Object.keys(w.players).length >= 1;
  // d just inside contact threshold
  reg.contactHelper =
    circlesContact(0, 10, 10) === true &&
    circlesContact(100, 10, 10) === false &&
    circlesContact(10 + 10 - AGAR_COLLIDE_EPS - 0.01, 10, 10) === true &&
    circlesContact(10 + 10 - AGAR_COLLIDE_EPS + 0.01, 10, 10) === false;
}

const maxOverlapMs = Math.max(
  headOn.overlapMs,
  chase.overlapMs,
  smallEaten.overlapMs,
  largeEats.overlapMs,
  split.overlapMs,
  virus.overlapMs
);

const report = {
  ticket: "AGAR-FUN-005",
  tickMs: AGAR_TICK_MS,
  fpsLogic: Math.round(1000 / AGAR_TICK_MS),
  collideEps: AGAR_COLLIDE_EPS,
  pipeline: {
    physics: "tickAgarWorld → tryEatPlayers / tryVirusCollisions (after move)",
    authState: "cells spliced / alive=false / pop same tick",
    network: "N/A local MVP",
    interpolation: "NONE — React draws auth cell.x/y",
    render: "setState each tick (~1 frame after auth)",
  },
  rootCauseBefore: {
    eat: "d < hr - 0.28*pr (deep swallow)",
    virus: "d < cr - vr*0.15 (deep swallow)",
    legacyChaseEstimateMs: legacyEst.ms,
    note: "Detection late — not interpolation. Auth waited for deep penetration.",
  },
  theory,
  latency: {
    headOnMs: headOn.latencyMs,
    chaseMs: chase.latencyMs,
    smallEatenMs: smallEaten.latencyMs,
    largeEatsMs: largeEats.latencyMs,
    splitMs: split.latencyMs,
    virusMs: virus.latencyMs,
  },
  overlap: {
    headOnMs: headOn.overlapMs,
    chaseMs: chase.overlapMs,
    splitMs: split.overlapMs,
    virusMs: virus.overlapMs,
    maxMs: maxOverlapMs,
  },
  detail: { headOn, chase, smallEaten, largeEats, split, virus },
  regression: reg,
  pass: {
    maxOverlapUnder200ms: maxOverlapMs <= 200,
    allLatenciesUnder200ms: [
      headOn.latencyMs,
      chase.latencyMs,
      split.latencyMs,
      virus.latencyMs,
    ].every((ms) => ms <= 200),
    allResolved:
      headOn.resolved &&
      chase.resolved &&
      smallEaten.resolved &&
      largeEats.resolved &&
      split.resolved &&
      virus.popped,
    regressions:
      reg.growth && reg.virus && reg.space && reg.w && reg.top10 && reg.minimap && reg.contactHelper,
  },
};

writeFileSync(join(__dirname, "probe-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
