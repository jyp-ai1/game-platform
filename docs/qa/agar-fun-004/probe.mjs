/**
 * AGAR-FUN-004 headless probe — map 2× · gem tiers · early growth · viewport cull.
 * Run: npx tsx docs/qa/agar-fun-004/probe.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createAgarWorld,
  tickAgarWorld,
  splitPlayer,
  totalMass,
  cameraFocus,
  countCells,
  countGemTiers,
  gemRenderSize,
  inViewport,
  AGAR_WORLD,
  AGAR_FOOD_TARGET,
  AGAR_BOT_COUNT,
  AGAR_START_MASS,
  AGAR_VIRUS_TARGET,
  AGAR_VIRUS_MAX,
  AGAR_TICK_MS,
  AGAR_GEM_SMALL,
  AGAR_GEM_MEDIUM,
  AGAR_GEM_LARGE,
  AGAR_EARLY_GEM_COUNT,
} from "../../../games/agar/src/agar-io-engine.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEW = 520;

/** FUN-003 baseline (b47020e) for before/after table */
const BEFORE = {
  world: 900,
  foodTarget: 220,
  botCount: 18,
  startMass: 36,
  virusTarget: 10,
  virusMax: 14,
  fps: 30,
  gemCull: "none (all gems rendered)",
};

function fresh(id = "player:qa") {
  return { id, world: createAgarWorld(id, "QA", "normal") };
}

const results = {
  before: BEFORE,
  after: {},
  tests: {},
};

{
  const { id, world: w } = fresh();
  const tiers = countGemTiers(w);
  const bots = Object.values(w.players).filter((p) => p.isBot).length;
  const me = w.players[id];
  const startMass = me ? totalMass(me) : 0;
  const cam = cameraFocus(me);
  let culledVisible = 0;
  for (const f of w.food) {
    if (inViewport(f.x, f.y, cam.x, cam.y, VIEW)) culledVisible += 1;
  }

  results.after = {
    world: w.size,
    foodTarget: AGAR_FOOD_TARGET,
    foodActual: w.food.length,
    gemTiers: tiers,
    botCount: bots,
    botConst: AGAR_BOT_COUNT,
    startMass,
    startMassConst: AGAR_START_MASS,
    virusCount: w.viruses.length,
    virusTarget: AGAR_VIRUS_TARGET,
    virusMax: AGAR_VIRUS_MAX,
    cellCount: countCells(w),
    earlyGemSeed: AGAR_EARLY_GEM_COUNT,
    gemsInViewport: culledVisible,
    gemsTotal: w.food.length,
    cullRatio: Math.round((culledVisible / Math.max(1, w.food.length)) * 1000) / 1000,
    fpsLogic: Math.round(1000 / AGAR_TICK_MS),
    gemSizes: {
      small: gemRenderSize(AGAR_GEM_SMALL),
      medium: gemRenderSize(AGAR_GEM_MEDIUM),
      large: gemRenderSize(AGAR_GEM_LARGE),
    },
  };

  results.tests.map2x = w.size === 1800 && AGAR_WORLD === 1800 && w.size === BEFORE.world * 2;
  results.tests.gemTiers =
    tiers.small > tiers.medium &&
    tiers.medium > 0 &&
    tiers.large > 0 &&
    gemRenderSize(1) < gemRenderSize(2) &&
    gemRenderSize(2) < gemRenderSize(3);
  results.tests.notBlindFood2x = w.food.length < BEFORE.foodTarget * 2.2;
  results.tests.botsRetuned = bots === AGAR_BOT_COUNT && bots > BEFORE.botCount && bots < BEFORE.botCount * 2;
  results.tests.virusRetuned =
    w.viruses.length === AGAR_VIRUS_TARGET &&
    AGAR_VIRUS_TARGET > BEFORE.virusTarget &&
    AGAR_VIRUS_TARGET < BEFORE.virusTarget * 2;
  results.tests.startNotHuge = startMass === AGAR_START_MASS && startMass < BEFORE.startMass;
  results.tests.viewportCull = culledVisible < w.food.length * 0.55;
}

// Early growth: isolate from bots — eat nearby gems ~45s → mass rises, not already huge
{
  const { id, world: w } = fresh();
  const me = w.players[id];
  // Remove bots so growth measures gem economy, not PvP noise
  for (const p of Object.values(w.players)) {
    if (p.isBot) {
      p.alive = false;
      p.cells = [];
    }
  }
  const mass0 = totalMass(me);
  const ticks = Math.round(45_000 / AGAR_TICK_MS);
  for (let i = 0; i < ticks; i++) {
    const head = me.cells[0];
    if (!head) break;
    let best = null;
    let bestD = 260;
    for (const f of w.food) {
      if (f.kind === "eject" || f.kind === "frag") continue;
      const d = Math.hypot(f.x - head.x, f.y - head.y);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    if (best) {
      me.aimX = best.x;
      me.aimY = best.y;
    }
    tickAgarWorld(w, Date.now() + i * AGAR_TICK_MS);
  }
  const mass45 = totalMass(me);
  results.after.earlyMass0 = Math.round(mass0 * 10) / 10;
  results.after.earlyMass45s = Math.round(mass45 * 10) / 10;
  results.tests.earlyGrowth =
    me.alive && mass45 > mass0 + 8 && mass45 < 220 && mass0 === AGAR_START_MASS;
}

// YOU cell ID after split — local cells get emphasis only in UI; engine still owns split
{
  const { id, world: w } = fresh();
  const p = w.players[id];
  p.cells = [{ x: 400, y: 400, mass: 120 }];
  p.aimX = 500;
  p.aimY = 400;
  splitPlayer(w, id, Date.now());
  results.tests.youSplitPieces = p.cells.length === 2;
  results.tests.youCellIdApproach = "bright outline + soft glow (local only)";
}

results.tests.allPass = Object.entries(results.tests)
  .filter(([k]) => k !== "allPass" && k !== "youCellIdApproach")
  .every(([, v]) => v === true);

const outPath = join(__dirname, "probe-report.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
console.log("\nWrote", outPath);
console.log("ALL_PASS", results.tests.allPass);
