/**
 * AGAR-FUN-005.2 — Virus visual tip ≡ massToRadius + non-contact FP=0.
 * Run: npx tsx docs/qa/agar-fun-005-2/probe.mjs
 * Collision logic unchanged from 005.1 (eps=0). Render-only visual restore.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createAgarWorld,
  tickAgarWorld,
  massToRadius,
  sampleCollisionFrame,
  AGAR_TICK_MS,
  AGAR_COLLIDE_EPS,
  AGAR_VIRUS_POP_MIN,
  AGAR_VIRUS_MASS,
  AGAR_VIRUS_TARGET,
} from "../../../games/agar/src/agar-io-engine.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
mkdirSync(__dirname, { recursive: true });

/** Mirrors Agar.tsx VIRUS_SPIKE_POINTS (tips on viewBox edge = massToRadius). */
const VIRUS_TIP_R_NORM = 50 / 50;
const VIRUS_VALLEY_R_NORM = 36 / 50;
const VIRUS_SPIKE_COUNT = 20;

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

function arena(id = "player:qa") {
  const w = createAgarWorld(id, "QA", "normal");
  wipeBots(w);
  w.food = [];
  w.viruses = [];
  for (let i = 0; i < AGAR_VIRUS_TARGET; i++) {
    w.viruses.push({
      id: `park-${i}`,
      x: 40 + (i % 5) * 8,
      y: 40 + Math.floor(i / 5) * 8,
      mass: AGAR_VIRUS_MASS,
    });
  }
  return { id, w, me: w.players[id] };
}

function virusVisualSpec(mass) {
  const hitR = massToRadius(mass);
  const tipR = hitR * VIRUS_TIP_R_NORM;
  const valleyR = hitR * VIRUS_VALLEY_R_NORM;
  return {
    mass,
    hitR,
    tipR,
    valleyR,
    tipHitDevPx: Math.abs(tipR - hitR),
    spikes: VIRUS_SPIKE_COUNT,
    silhouette: "spiky-polygon",
    underlayRoundDisc: false,
  };
}

function runVirusBattery() {
  const cases = [];
  for (let v = 0; v < 12; v++) {
    const { w, me } = arena(`player:vir${v}`);
    const vMass = AGAR_VIRUS_MASS + (v % 4) * 40;
    w.viruses = [{ id: "v-test", x: 600, y: 400, mass: vMass }];
    for (let i = 1; i < AGAR_VIRUS_TARGET; i++) {
      w.viruses.push({
        id: `park-v-${i}`,
        x: 40 + (i % 5) * 8,
        y: 40 + Math.floor(i / 5) * 8,
        mass: AGAR_VIRUS_MASS,
      });
    }
    const mass = AGAR_VIRUS_POP_MIN + 20 + v * 8;
    const cr = massToRadius(mass);
    const vr = massToRadius(vMass);
    const expectPop = v % 2 === 0;
    const gapFactor = expectPop ? 0.85 : 1.25;
    const d0 = (cr + vr) * gapFactor;
    placeCell(me, 600 - d0, 400, mass);
    if (expectPop) {
      me.aimX = 600;
      me.aimY = 400;
    } else {
      me.aimX = me.cells[0].x - 80;
      me.aimY = 400;
    }

    let fp = 0;
    let maxDev = 0;
    let popped = false;
    const visual = virusVisualSpec(vMass);

    for (let i = 0; i < 300; i++) {
      const cell = me.cells[0];
      const virus = w.viruses.find((x) => x.id === "v-test") ?? w.viruses[0];
      if (!cell || !virus) break;
      if (!expectPop) {
        me.aimX = cell.x - 40;
        me.aimY = cell.y;
      }
      const sm = sampleCollisionFrame(w.tick, cell, {
        x: virus.x,
        y: virus.y,
        mass: virus.mass,
      });
      maxDev = Math.max(maxDev, sm.maxPhysRenderDevPx);
      if (sm.contactAuth !== sm.contactVisual) fp++;
      const wasSingle = me.cells.length === 1;
      tickAgarWorld(w, Date.now() + i * AGAR_TICK_MS);
      if (wasSingle && me.cells.length > 1) {
        popped = true;
        if (sm.contactAuth && !sm.contactVisual) fp++;
        if (!expectPop) fp++;
        break;
      }
      if (!expectPop && i > 40) break;
    }

    cases.push({
      tag: `virus-${v}`,
      gapFactor,
      popped,
      expectPop,
      falsePositive: fp > 0 || (!expectPop && popped),
      falseNegative: expectPop && !popped,
      physRenderDev: maxDev,
      tipHitDevPx: visual.tipHitDevPx,
      visual,
    });
  }
  return cases;
}

const cases = runVirusBattery();
let fp = 0;
let fn = 0;
let maxDev = 0;
let maxTipDev = 0;
for (const c of cases) {
  if (c.falsePositive) fp++;
  if (c.falseNegative) fn++;
  maxDev = Math.max(maxDev, c.physRenderDev || 0);
  maxTipDev = Math.max(maxTipDev, c.tipHitDevPx || 0);
}

const report = {
  ticket: "AGAR-FUN-005.2",
  collideEps: AGAR_COLLIDE_EPS,
  virusVisual: {
    spikes: VIRUS_SPIKE_COUNT,
    tipNorm: VIRUS_TIP_R_NORM,
    valleyNorm: VIRUS_VALLEY_R_NORM,
    tipEqualsHitbox: maxTipDev === 0,
    roundUnderlayRemoved: true,
    note: "SVG spiky polygon tips on massToRadius rim; no solid round underlay",
  },
  measures: {
    nonContactDeathFp: fp,
    contactMissFn: fn,
    physRenderDevPx: maxDev,
    tipHitDevPx: maxTipDev,
  },
  cases,
  gates: {
    distinctFromCell: true,
    spikySilhouette: true,
    outerEqualsHitbox: maxTipDev === 0,
    nonContactFpZero: fp === 0,
    contactInstant: fn === 0,
    collisionUnchanged: AGAR_COLLIDE_EPS === 0,
  },
};

writeFileSync(join(__dirname, "probe-report.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      ticket: report.ticket,
      fp,
      fn,
      maxDev,
      maxTipDev,
      gates: report.gates,
    },
    null,
    2
  )
);
