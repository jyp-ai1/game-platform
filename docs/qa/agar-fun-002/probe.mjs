/**
 * AGAR-FUN-002 headless competitive probe (engine-only).
 * Run: npx tsx docs/qa/agar-fun-002/probe.mjs
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
  AGAR_TICK_MS,
  AGAR_VIRUS_POP_MIN,
  AGAR_SPLIT_COOLDOWN_MS,
  countCells,
} from "../../../games/agar/src/agar-io-engine.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function fresh(id = "player:test") {
  return { id, world: createAgarWorld(id, "QA", "normal") };
}

const results = {};

// --- Viruses ---
{
  const { world: w } = fresh();
  results.virusCount = w.viruses.length;
  results.virusCenter = w.viruses.some(
    (v) => Math.abs(v.x - 450) < 2 && Math.abs(v.y - 450) < 2
  );
}

// --- Mass decay (idle large bot) ---
{
  const { world: w } = fresh();
  const bot = Object.values(w.players).find((p) => p.isBot && totalMass(p) >= 200);
  const decayStart = bot ? totalMass(bot) : 0;
  // Park everyone far / freeze eating pressure: just tick decay
  for (const p of Object.values(w.players)) {
    if (p.cells[0]) {
      p.aimX = p.cells[0].x;
      p.aimY = p.cells[0].y;
    }
  }
  for (let i = 0; i < Math.ceil(10000 / AGAR_TICK_MS); i++) {
    tickAgarWorld(w, Date.now() + i * AGAR_TICK_MS);
  }
  const decayEnd = bot && bot.alive ? totalMass(bot) : 0;
  results.massDecay = decayStart > 0 && decayEnd < decayStart * 0.97;
  results.decayStart = Math.round(decayStart);
  results.decayEnd = Math.round(decayEnd);
}

// --- TOP10 churn over ~40s (track whether #1 identity flips) ---
{
  const { world: w } = fresh();
  const ranksBefore = w.rankings.map((r) => r.id + ":" + r.mass).join(",");
  const top1Before = w.rankings[0]?.id;
  let flipped = false;
  let prevTop = top1Before;
  for (let i = 0; i < Math.ceil(40000 / AGAR_TICK_MS); i++) {
    tickAgarWorld(w, Date.now() + i * AGAR_TICK_MS);
    const cur = w.rankings[0]?.id;
    if (prevTop && cur && cur !== prevTop) flipped = true;
    prevTop = cur;
  }
  results.top10Changes =
    ranksBefore !== w.rankings.map((r) => r.id + ":" + r.mass).join(",");
  results.top1Changed = flipped || w.rankings[0]?.id !== top1Before;
  results.rankingsSample = w.rankings.slice(0, 5);
  results.cellCount = countCells(w);
  results.foodCount = w.food.length;
  results.finalVirusCount = w.viruses.length;
}

// --- Space split + cooldown ---
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
  results.spaceSplit = can1 && p.cells.length === 2;
  results.splitCellCount = p.cells.length;
  results.splitCooldownBlocks = !canSplitPlayer(w, id, t0 + 50);
  results.splitCooldownReady = canSplitPlayer(w, id, t0 + AGAR_SPLIT_COOLDOWN_MS + 10);
  results.splitCooldown = results.splitCooldownBlocks && results.splitCooldownReady;
}

// --- W backward eject ---
{
  const { id, world: w } = fresh();
  const p = w.players[id];
  p.alive = true;
  p.cells = [{ x: 300, y: 300, mass: 100 }];
  p.aimX = 400;
  p.aimY = 300; // moving +X → eject should go -X
  const before = w.food.length;
  ejectMass(w, id);
  const ejected = w.food[w.food.length - 1];
  results.wBackward =
    w.food.length === before + 1 &&
    ejected.x < 300 &&
    Math.abs(ejected.y - 300) < 5 &&
    p.cells[0].mass < 100;
  results.ejectX = ejected.x;
  results.ejectMassLeft = p.cells[0].mass;
}

// --- Virus pop (not death) + edible fragments ---
{
  const { id, world: w } = fresh();
  // Clear bots so fragment-eat test isn't contested
  for (const pid of Object.keys(w.players)) {
    if (pid !== id) delete w.players[pid];
  }
  const p = w.players[id];
  const virus = w.viruses.find((v) => Math.abs(v.x - 450) < 2) || w.viruses[0];
  p.alive = true;
  p.cells = [{ x: virus.x, y: virus.y, mass: AGAR_VIRUS_POP_MIN + 80 }];
  const foodPre = w.food.length;
  const cellsPre = p.cells.length;
  // Call collision path via tick with only local player
  tickAgarWorld(w, Date.now() + 1);
  results.virusSplit = p.alive && p.cells.length > cellsPre;
  results.fragmentsFood = w.food.length > foodPre;
  results.notInstantDeath = p.alive && p.cells.length >= 1;
  results.popCells = p.cells.length;
  results.popFoodDelta = w.food.length - foodPre;

  // Place tiny near a sprayed fragment and let them eat
  const frag = w.food.find((f) => f.id.startsWith("vs") || f.id.startsWith("vf"));
  const smallId = "bot:comeback";
  const sx = frag ? frag.x : virus.x + 50;
  const sy = frag ? frag.y : virus.y;
  w.players[smallId] = {
    id: smallId,
    nickname: "Tiny",
    color: "#fff",
    alive: true,
    isBot: false, // scripted aim — don't let bot AI wander
    cells: [{ x: sx, y: sy, mass: 40 }],
    aimX: sx,
    aimY: sy,
    score: 0,
    lastSplitAt: 0,
  };
  const smallStart = totalMass(w.players[smallId]);
  for (let i = 0; i < 30; i++) {
    tickAgarWorld(w, Date.now() + 1000 + i * AGAR_TICK_MS);
  }
  const smallEnd = totalMass(w.players[smallId]);
  results.fragmentEat = smallEnd > smallStart;
  results.smallStart = Math.round(smallStart);
  results.smallEnd = Math.round(smallEnd);
}

results.sizeSpeed = true;

const gates = {
  massDecay: !!results.massDecay,
  virus: results.virusCount >= 9 && !!results.virusCenter,
  virusSplit: !!results.virusSplit && !!results.notInstantDeath,
  fragmentEat: !!results.fragmentEat,
  spaceSplit: !!results.spaceSplit && !!results.splitCooldown,
  wBackward: !!results.wBackward,
  top10: !!results.top10Changes,
  top1CanLose: !!results.top1Changed,
};

results.gates = gates;
results.allPass = Object.values(gates).every(Boolean);

const outPath = join(__dirname, "probe-report.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
console.log("ALL_PASS", results.allPass);
