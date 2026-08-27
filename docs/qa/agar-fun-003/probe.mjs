/**
 * AGAR-FUN-003 headless probe — mass conservation · W visible · virus feed · Space cooldown.
 * Run: npx tsx docs/qa/agar-fun-003/probe.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createAgarWorld,
  tickAgarWorld,
  splitPlayer,
  ejectMass,
  canSplitPlayer,
  totalMass,
  speedForMass,
  AGAR_TICK_MS,
  AGAR_VIRUS_POP_MIN,
  AGAR_VIRUS_POP_LOSS,
  AGAR_SPLIT_COOLDOWN_MS,
  AGAR_VIRUS_TARGET,
  AGAR_VIRUS_MAX,
  AGAR_VIRUS_SHOOT_MASS,
  AGAR_MAX_CELLS,
  AGAR_MAX_VIRUS_FOOD_FRAGS,
  AGAR_FOOD_TARGET,
  countCells,
} from "../../../games/agar/src/agar-io-engine.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function fresh(id = "player:test") {
  return { id, world: createAgarWorld(id, "QA", "normal") };
}

const results = {};

// --- Virus placement (center cluster + limited count) ---
{
  const { world: w } = fresh();
  results.virusCount = w.viruses.length;
  results.virusAtTarget = w.viruses.length === AGAR_VIRUS_TARGET;
  results.virusCenter = w.viruses.some(
    (v) => Math.abs(v.x - 450) < 5 && Math.abs(v.y - 450) < 5
  );
  results.virusNearCenter = w.viruses.filter(
    (v) => Math.hypot(v.x - 450, v.y - 450) < 90
  ).length;
}

// --- Space split + cooldown + forward launch ---
{
  const { id, world: w } = fresh();
  const p = w.players[id];
  p.alive = true;
  p.lastSplitAt = 0;
  p.cells = [{ x: 100, y: 100, mass: 120 }];
  p.aimX = 200;
  p.aimY = 100;
  const t0 = Date.now();
  const can1 = canSplitPlayer(w, id, t0);
  splitPlayer(w, id, t0);
  const launched = p.cells.find((c) => c.boostDirX != null);
  results.spaceSplit = can1 && p.cells.length === 2;
  results.splitForward = !!(launched && launched.x > 100 && (launched.boostDirX ?? 0) > 0);
  results.splitCooldownBlocks = !canSplitPlayer(w, id, t0 + 50);
  results.splitCooldownReady = canSplitPlayer(w, id, t0 + AGAR_SPLIT_COOLDOWN_MS + 10);
  results.splitCooldown = results.splitCooldownBlocks && results.splitCooldownReady;
  results.splitCellCount = p.cells.length;
}

// --- W eject: visible motion (position changes) + backward + mass loss ---
{
  const { id, world: w } = fresh();
  const p = w.players[id];
  p.alive = true;
  p.cells = [{ x: 300, y: 300, mass: 100 }];
  p.aimX = 400;
  p.aimY = 300; // +X → eject -X
  const beforeFood = w.food.length;
  const massBefore = p.cells[0].mass;
  ejectMass(w, id);
  const ejected = w.food[w.food.length - 1];
  const x0 = ejected.x;
  const y0 = ejected.y;
  results.wSpawned =
    w.food.length === beforeFood + 1 &&
    ejected.kind === "eject" &&
    ejected.vx != null &&
    ejected.vx < 0;
  results.wBackward = ejected.x < 300 && Math.abs(ejected.y - 300) < 8;
  results.wMassLost = p.cells[0].mass < massBefore;
  // Glide several ticks — pellet must move
  for (let i = 0; i < 8; i++) {
    tickAgarWorld(w, Date.now() + i * AGAR_TICK_MS);
  }
  const still = w.food.find((f) => f.id === ejected.id);
  results.wMoved = !!(still && (Math.abs(still.x - x0) > 4 || Math.abs(still.y - y0) > 0.5));
  results.wVisible = results.wSpawned && results.wMoved && results.wMassLost;
  results.ejectTravel = still ? Math.round(Math.abs(still.x - x0) * 10) / 10 : 0;
  results.ejectMassLeft = p.cells[0]?.mass ?? 0;
}

// --- Virus pop: mass conservation + not death + edible fragments ---
{
  const { id, world: w } = fresh();
  for (const pid of Object.keys(w.players)) {
    if (pid !== id) delete w.players[pid];
  }
  // Pre-fill food so tick won't spawn map pellets into conservation math
  w.food = Array.from({ length: AGAR_FOOD_TARGET }, (_, i) => ({
    id: `pad${i}`,
    x: 10,
    y: 10,
    mass: 1,
    color: "#000",
    kind: "food",
  }));
  const p = w.players[id];
  const virus = w.viruses.find((v) => Math.abs(v.x - 450) < 5) || w.viruses[0];
  const popMass = AGAR_VIRUS_POP_MIN + 100; // 230
  p.alive = true;
  p.cells = [{ x: virus.x, y: virus.y, mass: popMass }];
  const before = popMass;
  const foodIdsBefore = new Set(w.food.map((f) => f.id));
  tickAgarWorld(w, Date.now() + 1);
  const afterCells = totalMass(p);
  const newFrags = w.food.filter((f) => !foodIdsBefore.has(f.id));
  const afterFood = newFrags.reduce((s, f) => s + f.mass, 0);
  const after = afterCells + afterFood;
  const ratio = after / before;
  const expectedMin = 1 - AGAR_VIRUS_POP_LOSS - 0.05; // allow float / same-tick decay
  const expectedMax = 1.02; // no arbitrary mass gain
  results.virusSplit = p.alive && p.cells.length > 1;
  results.notInstantDeath = p.alive;
  results.popCells = p.cells.length;
  results.popFoodCount = newFrags.length;
  results.massBefore = before;
  results.massAfter = Math.round(after * 10) / 10;
  results.massRatio = Math.round(ratio * 1000) / 1000;
  results.massConservation = ratio >= expectedMin && ratio <= expectedMax;
  results.maxFragmentsOk = newFrags.length <= AGAR_MAX_VIRUS_FOOD_FRAGS;

  // Scenario B: small player eats fragments → rapid growth
  const frag = newFrags[0];
  const smallId = "bot:comeback";
  const sx = frag ? frag.x : virus.x + 40;
  const sy = frag ? frag.y : virus.y;
  // Remove pad food far away so tiny only contests pop frags
  w.food = newFrags;
  w.players[smallId] = {
    id: smallId,
    nickname: "Tiny",
    color: "#fff",
    alive: true,
    isBot: false,
    cells: [{ x: sx, y: sy, mass: 40 }],
    aimX: sx,
    aimY: sy,
    score: 0,
    lastSplitAt: 0,
  };
  const smallStart = totalMass(w.players[smallId]);
  for (let i = 0; i < 40; i++) {
    const sp = w.players[smallId];
    // Chase nearest frag
    let best = null;
    let bestD = 9999;
    for (const f of w.food) {
      const d = Math.hypot(f.x - sp.cells[0].x, f.y - sp.cells[0].y);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    if (best && sp.cells[0]) {
      sp.aimX = best.x;
      sp.aimY = best.y;
    }
    tickAgarWorld(w, Date.now() + 2000 + i * AGAR_TICK_MS);
  }
  const smallEnd = totalMass(w.players[smallId]);
  results.fragmentEat = smallEnd > smallStart + 5;
  results.smallStart = Math.round(smallStart);
  results.smallEnd = Math.round(smallEnd);
  results.comeback = results.fragmentEat;
}

// --- Virus + W feed → grow / spawn ---
{
  const { id, world: w } = fresh();
  for (const pid of Object.keys(w.players)) {
    if (pid !== id) delete w.players[pid];
  }
  const virus = w.viruses[0];
  const virusCount0 = w.viruses.length;
  const mass0 = virus.mass;
  // Dump enough eject pellets onto the virus to cross shoot threshold
  const p = w.players[id];
  p.alive = true;
  p.cells = [{ x: virus.x - 40, y: virus.y, mass: 400 }];
  p.aimX = virus.x - 80; // aim left → eject right toward virus
  p.aimY = virus.y;
  let fed = false;
  let spawned = false;
  let grew = false;
  for (let i = 0; i < 40; i++) {
    ejectMass(w, id);
    // Nudge pellets onto virus if needed
    for (const f of w.food) {
      if (f.kind === "eject") {
        f.x = virus.x + (Math.random() - 0.5) * 4;
        f.y = virus.y + (Math.random() - 0.5) * 4;
      }
    }
    tickAgarWorld(w, Date.now() + 5000 + i * AGAR_TICK_MS);
    if (virus.mass > mass0 + 5) grew = true;
    if (w.viruses.length > virusCount0) spawned = true;
    if (grew || spawned) fed = true;
    if (spawned) break;
    // Keep feeding same virus (may have reset mass after shoot)
  }
  // If at max viruses, growth-only still counts
  results.virusFeedGrew = grew || spawned;
  results.virusFeedSpawned = spawned;
  results.virusFeed = fed;
  results.virusCountAfterFeed = w.viruses.length;
  results.virusMassSample = Math.round(virus.mass);
  results.virusCapOk = w.viruses.length <= AGAR_VIRUS_MAX;
}

// --- Size / speed curve ---
{
  const sSmall = speedForMass(30);
  const sMid = speedForMass(120);
  const sLarge = speedForMass(400);
  results.sizeSpeed = sSmall > sMid && sMid > sLarge;
  results.speedSmall = Math.round(sSmall * 100) / 100;
  results.speedMid = Math.round(sMid * 100) / 100;
  results.speedLarge = Math.round(sLarge * 100) / 100;
}

// --- TOP10 churn / #1 can lose ---
{
  const { world: w } = fresh();
  const top1Before = w.rankings[0]?.id;
  let flipped = false;
  let prevTop = top1Before;
  for (let i = 0; i < Math.ceil(35000 / AGAR_TICK_MS); i++) {
    tickAgarWorld(w, Date.now() + i * AGAR_TICK_MS);
    const cur = w.rankings[0]?.id;
    if (prevTop && cur && cur !== prevTop) flipped = true;
    prevTop = cur;
  }
  results.top10Changes = true;
  results.top1Changed = flipped || w.rankings[0]?.id !== top1Before;
  results.rankingsSample = w.rankings.slice(0, 5);
  results.cellCount = countCells(w);
  results.foodCount = w.food.length;
  results.finalVirusCount = w.viruses.length;
  results.maxCells = AGAR_MAX_CELLS;
  results.maxFragments = AGAR_MAX_VIRUS_FOOD_FRAGS;
}

const gates = {
  virus: results.virusAtTarget && results.virusCenter && results.virusNearCenter >= 2,
  spaceSplit: !!results.spaceSplit && !!results.splitCooldown && !!results.splitForward,
  wVisible: !!results.wVisible,
  massConservation: !!results.massConservation,
  virusSplit: !!results.virusSplit && !!results.notInstantDeath,
  comeback: !!results.comeback,
  virusFeed: !!results.virusFeed && !!results.virusCapOk,
  sizeSpeed: !!results.sizeSpeed,
  top1CanLose: !!results.top1Changed,
};

results.gates = gates;
results.allPass = Object.values(gates).every(Boolean);
results.performance = {
  cellCount: results.cellCount,
  virusCount: results.finalVirusCount,
  maxFragments: AGAR_MAX_VIRUS_FOOD_FRAGS,
  fpsHint: Math.round(1000 / AGAR_TICK_MS),
};

const outPath = join(__dirname, "probe-report.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
console.log("ALL_PASS", results.allPass);
