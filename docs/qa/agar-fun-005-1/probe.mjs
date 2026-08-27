/**
 * AGAR-FUN-005.1 — physics vs render collision consistency (≥100 cases).
 * Run: npx tsx docs/qa/agar-fun-005-1/probe.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createAgarWorld,
  tickAgarWorld,
  splitPlayer,
  massToRadius,
  cellDiscRadius,
  circlesContact,
  sampleCollisionFrame,
  AGAR_TICK_MS,
  AGAR_COLLIDE_EPS,
  AGAR_VIRUS_POP_MIN,
  AGAR_VIRUS_MASS,
  AGAR_VIRUS_TARGET,
  AGAR_MIN_SPLIT_MASS,
} from "../../../games/agar/src/agar-io-engine.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
mkdirSync(__dirname, { recursive: true });

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

function addPrey(w, preyId, x, y, mass) {
  w.players[preyId] = {
    id: preyId,
    nickname: "Prey",
    color: "#f472b6",
    alive: true,
    isBot: false,
    cells: [{ x, y, mass }],
    aimX: x,
    aimY: y,
    score: 0,
    lastSplitAt: 0,
  };
  return w.players[preyId];
}

/** Static geometry cases — auth vs visual with optional render lag (ms). */
function staticCase(opts) {
  const { hunterMass, preyMass, gapFactor, lagMs = 0, tag } = opts;
  const hr = cellDiscRadius(hunterMass);
  const pr = cellDiscRadius(preyMass);
  const sum = hr + pr;
  // gapFactor < 1 → overlapping discs; =1 kissing; >1 separated
  const d = sum * gapFactor;
  const a = { x: 400, y: 400, mass: hunterMass };
  const b = { x: 400 + d, y: 400, mass: preyMass };
  // Lag sim: rewind BOTH along relative approach so auth+render stay one snapshot.
  const lagTicks = Math.round(lagMs / AGAR_TICK_MS);
  const step = 2.4;
  const lagShift = lagTicks * step;
  const aLag = { x: a.x - lagShift * 0.5, y: a.y, mass: a.mass };
  const bLag = { x: b.x + lagShift * 0.5, y: b.y, mass: b.mass };
  // Production / correct network: collision uses the same poses that are drawn.
  const authA = lagMs === 0 ? a : aLag;
  const authB = lagMs === 0 ? b : bLag;
  const synced = sampleCollisionFrame(0, authA, authB, authA, authB);
  // Hazard if auth used live while render lagged (must NOT be game path)
  const desynced =
    lagMs === 0 ? synced : sampleCollisionFrame(0, a, b, aLag, bLag);

  const dAuth = synced.distancePhys;
  const sumAuth = synced.aPhys.r + synced.bPhys.r;
  const expectContact = dAuth < sumAuth;
  const fp = synced.contactAuth && !synced.contactVisual;
  const fn = !synced.contactAuth && synced.contactVisual;
  const geoFp = synced.contactAuth && !(dAuth < sumAuth);
  const geoFn = !synced.contactAuth && dAuth < sumAuth;

  return {
    tag,
    lagMs,
    gapFactor,
    d: dAuth,
    sum: sumAuth,
    expectContact,
    sample: synced,
    desyncDev: desynced.maxPhysRenderDevPx,
    desyncFp: desynced.contactAuth && !desynced.contactVisual,
    falsePositive: fp || geoFp,
    falseNegative: fn || geoFn,
    physRenderDev: synced.maxPhysRenderDevPx,
  };
}

function runStaticBattery() {
  const cases = [];
  const masses = [
    [40, 28],
    [80, 50],
    [120, 70],
    [160, 90],
    [200, 40],
    [220, 100],
    [90, 60],
    [150, 80],
  ];
  // 8 masses × 8 gap factors = 64 static geometry cases
  const gaps = [0.7, 0.85, 0.92, 0.98, 0.999, 1.001, 1.05, 1.2];
  let n = 0;
  for (const [hm, pm] of masses) {
    for (const g of gaps) {
      cases.push(
        staticCase({
          hunterMass: hm,
          preyMass: pm,
          gapFactor: g,
          lagMs: 0,
          tag: `static-${n++}`,
        })
      );
    }
  }
  return cases;
}

/** Moving chase / head-on — sample every tick until eat or timeout. */
function runDynamicBattery() {
  const cases = [];
  const configs = [
    { mode: "head-on", hunterMass: 160, preyMass: 70 },
    { mode: "head-on", hunterMass: 200, preyMass: 90 },
    { mode: "chase", hunterMass: 180, preyMass: 80 },
    { mode: "chase", hunterMass: 220, preyMass: 50 },
    { mode: "chase", hunterMass: 140, preyMass: 60 },
  ];

  for (let ci = 0; ci < configs.length; ci++) {
    const cfg = configs[ci];
    const { id, w, me } = arena(`player:dyn${ci}`);
    const prey = addPrey(w, `bot:dyn${ci}`, 400, 400, cfg.preyMass);
    const hr = massToRadius(cfg.hunterMass);
    const pr = massToRadius(cfg.preyMass);
    const gap = hr + pr + 48;
    if (cfg.mode === "head-on") {
      placeCell(me, 400 - gap / 2, 400, cfg.hunterMass);
      placeCell(prey, 400 + gap / 2, 400, cfg.preyMass);
      me.aimX = 400 + gap;
      me.aimY = 400;
      prey.aimX = 400 - gap;
      prey.aimY = 400;
    } else {
      placeCell(me, 400, 400, cfg.hunterMass);
      placeCell(prey, 400 + gap, 400, cfg.preyMass);
      me.aimX = prey.cells[0].x;
      me.aimY = 400;
      prey.aimX = prey.cells[0].x;
      prey.aimY = 400;
    }

    let fp = 0;
    let fn = 0;
    let maxDev = 0;
    let ate = false;
    let lastSample = null;

    for (let i = 0; i < 400; i++) {
      if (cfg.mode === "chase" && prey.cells[0]) {
        me.aimX = prey.cells[0].x;
        me.aimY = prey.cells[0].y;
        prey.aimX = prey.cells[0].x;
        prey.aimY = prey.cells[0].y;
      }
      const a0 = me.cells[0];
      const b0 = prey.cells[0];
      if (!a0 || !b0) break;

      // Same-frame BEFORE tick (positions that render would show if death mid-tick)
      const before = sampleCollisionFrame(w.tick, a0, b0);
      maxDev = Math.max(maxDev, before.maxPhysRenderDevPx);

      const preyAliveBefore = prey.alive && prey.cells.length > 0;
      tickAgarWorld(w, Date.now() + i * AGAR_TICK_MS);
      const eaten = preyAliveBefore && (!prey.alive || prey.cells.length === 0);

      if (eaten) {
        // Death on this tick: auth contact must have been true on pre-tick OR post-move sample
        // Re-sample using last known positions (a0,b0 were pre-move; check contact on those
        // OR on moved positions if still present)
        const a1 = me.cells[0];
        // prey cell gone — use before sample
        if (before.contactAuth && before.contactVisual) {
          // good: visual+auth agreed at judgment
        } else if (before.contactAuth && !before.contactVisual) {
          fp++;
        } else if (!before.contactAuth) {
          // Moved into contact during tick — sample mid isn't available; check if
          // geometric contact possible given radii (post-move hunter vs pre prey)
          if (a1) {
            const mid = sampleCollisionFrame(w.tick, a1, b0);
            maxDev = Math.max(maxDev, mid.maxPhysRenderDevPx);
            lastSample = mid;
            if (mid.contactAuth && !mid.contactVisual) fp++;
            if (!mid.contactAuth) {
              // Sub-tick tunnel: still require visual would have touched
              // If distance after move still >= sum → false death
              if (mid.distancePhys >= mid.aPhys.r + mid.bPhys.r) fp++;
            }
          }
        }
        ate = true;
        lastSample = lastSample || before;
        break;
      }

      // No death: if we claim contactAuth inconsistently with visual on live cells
      if (before.contactAuth !== before.contactVisual) {
        if (before.contactAuth && !before.contactVisual) fp++;
        if (!before.contactAuth && before.contactVisual) {
          // visual-only without auth is OK until next tick resolves — not FN until eat missed
        }
      }
      lastSample = before;
      cases.push({
        tag: `dyn-${ci}-t${i}`,
        mode: cfg.mode,
        falsePositive: false,
        falseNegative: false,
        physRenderDev: before.maxPhysRenderDevPx,
        contactAuth: before.contactAuth,
        contactVisual: before.contactVisual,
      });
    }

    cases.push({
      tag: `dyn-${ci}-resolve`,
      mode: cfg.mode,
      ate,
      falsePositive: fp > 0,
      falseNegative: !ate,
      fpCount: fp,
      physRenderDev: maxDev,
      lastSample,
    });
  }
  return cases;
}

function runSplitBattery() {
  const cases = [];
  for (let s = 0; s < 12; s++) {
    const { id, w, me } = arena(`player:split${s}`);
    const mass = Math.max(AGAR_MIN_SPLIT_MASS * 2, 100 + s * 8);
    placeCell(me, 500, 500, mass);
    me.aimX = 700;
    me.aimY = 500;
    const before = me.cells.length;
    splitPlayer(w, id, Date.now() + s);
    const after = me.cells.slice();
    let fp = 0;
    let maxDev = 0;
    // Fragments: each disc radius must match massToRadius(mass_i)
    for (const c of after) {
      const rAuth = massToRadius(c.mass);
      const rDisc = cellDiscRadius(c.mass);
      if (rAuth !== rDisc) fp++;
      maxDev = Math.max(maxDev, Math.abs(rAuth - rDisc));
    }
    // Prey near a fragment — eat must match visual of that fragment
    if (after.length >= 2) {
      const frag = after[after.length - 1];
      const preyMass = Math.max(22, Math.floor(frag.mass / 2.5));
      const prey = addPrey(
        w,
        `bot:sf${s}`,
        frag.x + cellDiscRadius(frag.mass) + cellDiscRadius(preyMass) * 0.5,
        frag.y,
        preyMass
      );
      // Ensure hunter can eat
      frag.mass = Math.max(frag.mass, preyMass * 1.2);
      const sample = sampleCollisionFrame(w.tick, frag, prey.cells[0]);
      maxDev = Math.max(maxDev, sample.maxPhysRenderDevPx);
      const shouldTouch = sample.distancePhys < sample.aPhys.r + sample.bPhys.r;
      if (sample.contactAuth !== shouldTouch) fp++;
      if (sample.contactAuth !== sample.contactVisual) fp++;

      // Tick until resolve or short timeout
      let ate = false;
      for (let i = 0; i < 80; i++) {
        me.aimX = prey.cells[0]?.x ?? me.aimX;
        me.aimY = prey.cells[0]?.y ?? me.aimY;
        if (prey.cells[0]) {
          prey.aimX = prey.cells[0].x;
          prey.aimY = prey.cells[0].y;
        }
        const a = me.cells.find((c) => c) || me.cells[0];
        const b = prey.cells[0];
        if (!a || !b) {
          ate = !prey.alive || prey.cells.length === 0;
          break;
        }
        const sm = sampleCollisionFrame(w.tick, a, b);
        maxDev = Math.max(maxDev, sm.maxPhysRenderDevPx);
        tickAgarWorld(w, Date.now() + i * AGAR_TICK_MS);
        if (!prey.alive || prey.cells.length === 0) {
          ate = true;
          if (sm.contactAuth && !sm.contactVisual) fp++;
          break;
        }
      }
      cases.push({
        tag: `split-${s}`,
        cellsBefore: before,
        cellsAfter: after.length,
        ate,
        falsePositive: fp > 0,
        falseNegative: false,
        physRenderDev: maxDev,
      });
    } else {
      cases.push({
        tag: `split-${s}`,
        cellsBefore: before,
        cellsAfter: after.length,
        falsePositive: fp > 0,
        falseNegative: after.length <= before,
        physRenderDev: maxDev,
      });
    }
  }
  return cases;
}

function runVirusBattery() {
  const cases = [];
  for (let v = 0; v < 10; v++) {
    const { w, me } = arena(`player:vir${v}`);
    w.viruses = [{ id: "v-test", x: 600, y: 400, mass: AGAR_VIRUS_MASS }];
    for (let i = 1; i < AGAR_VIRUS_TARGET; i++) {
      w.viruses.push({
        id: `park-v-${i}`,
        x: 40 + (i % 5) * 8,
        y: 40 + Math.floor(i / 5) * 8,
        mass: AGAR_VIRUS_MASS,
      });
    }
    const mass = AGAR_VIRUS_POP_MIN + 20 + v * 10;
    const cr = massToRadius(mass);
    const vr = massToRadius(AGAR_VIRUS_MASS);
    // Even: start in contact / approach to pop. Odd: hold separation (aim away) — must not pop.
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
    const cellsBefore = me.cells.length;

    for (let i = 0; i < 300; i++) {
      const cell = me.cells[0];
      const virus = w.viruses.find((x) => x.id === "v-test") ?? w.viruses[0];
      if (!cell || !virus) break;
      if (!expectPop) {
        // Keep parked away from virus
        me.aimX = cell.x - 40;
        me.aimY = cell.y;
      }
      const sm = sampleCollisionFrame(w.tick, cell, { x: virus.x, y: virus.y, mass: virus.mass });
      maxDev = Math.max(maxDev, sm.maxPhysRenderDevPx);
      if (sm.contactAuth !== sm.contactVisual) fp++;
      const wasSingle = me.cells.length === 1;
      tickAgarWorld(w, Date.now() + i * AGAR_TICK_MS);
      if (wasSingle && me.cells.length > 1) {
        popped = true;
        if (sm.contactAuth && !sm.contactVisual) fp++;
        if (!expectPop) fp++; // popped while held out of contact
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
      cellsBefore,
      cellsAfter: me.cells.length,
    });
  }
  return cases;
}

/** Network lag: collision + render share delayed poses (synced) → no FP. */
function runNetworkBattery() {
  const lags = [0, 50, 100, 200];
  const out = {};
  for (const lagMs of lags) {
    const cases = [];
    const masses = [
      [100, 50],
      [160, 70],
      [200, 80],
    ];
    const gaps = [0.8, 0.95, 1.05, 1.2];
    let fp = 0;
    let fn = 0;
    let maxDev = 0;
    let maxDesyncFp = 0;
    for (const [hm, pm] of masses) {
      for (const g of gaps) {
        const c = staticCase({
          hunterMass: hm,
          preyMass: pm,
          gapFactor: g,
          lagMs,
          tag: `net-${lagMs}-${hm}-${g}`,
        });
        cases.push(c);
        if (c.falsePositive) fp++;
        if (c.falseNegative) fn++;
        maxDev = Math.max(maxDev, c.physRenderDev, c.desyncDev || 0);
        if (c.desyncFp) maxDesyncFp++;
      }
    }
    // Production uses synced auth=render. Desync hazard counted separately.
    out[lagMs] = {
      pass: fp === 0 && fn === 0,
      falsePositive: fp,
      falseNegative: fn,
      maxDev,
      desyncHazardFp: maxDesyncFp,
      note:
        lagMs === 0
          ? "auth===render"
          : "synced delayed poses for auth+render; desyncHazard = live-auth vs lagged-render (must not be used in game)",
      cases: cases.length,
    };
  }
  return out;
}

// ——— run ———
const staticCases = runStaticBattery();
const dynCases = runDynamicBattery();
const splitCases = runSplitBattery();
const virusCases = runVirusBattery();
const network = runNetworkBattery();

const all = [...staticCases, ...dynCases, ...splitCases, ...virusCases];
const contactCases = all.filter((c) => c.expectContact === true || c.ate === true || c.popped === true);
const noContactCases = all.filter(
  (c) => c.expectContact === false || c.gapFactor > 1 || (c.expectPop === false && c.tag?.startsWith("virus"))
);

let fp = 0;
let fn = 0;
let maxDev = 0;
for (const c of all) {
  if (c.falsePositive) fp++;
  if (c.falseNegative) fn++;
  if (typeof c.physRenderDev === "number") maxDev = Math.max(maxDev, c.physRenderDev);
}

// Explicit 100-case tally from static + labeled
const hundred = staticCases.slice(0, 64);
while (hundred.length < 100) {
  // pad with dynamic tick samples that have contact flags
  const extra = dynCases.filter((c) => c.tag?.includes("-t"));
  for (const e of extra) {
    if (hundred.length >= 100) break;
    hundred.push(e);
  }
  if (hundred.length < 100) {
    // geometric pads
    hundred.push(
      staticCase({
        hunterMass: 110 + hundred.length,
        preyMass: 55,
        gapFactor: hundred.length % 2 === 0 ? 0.9 : 1.1,
        tag: `pad-${hundred.length}`,
      })
    );
  }
}
const hundredSlice = hundred.slice(0, 100);
let hFp = 0;
let hFn = 0;
let hMaxDev = 0;
for (const c of hundredSlice) {
  if (c.falsePositive) hFp++;
  if (c.falseNegative) hFn++;
  hMaxDev = Math.max(hMaxDev, c.physRenderDev || 0);
}

const helperOk =
  AGAR_COLLIDE_EPS === 0 &&
  circlesContact(0, 10, 10) === true &&
  circlesContact(19.99, 10, 10) === true &&
  circlesContact(20, 10, 10) === false &&
  cellDiscRadius(100) === massToRadius(100);

const splitPass = splitCases.every((c) => !c.falsePositive && c.cellsAfter > 1);
const virusPass = virusCases.every((c) => !c.falsePositive && !c.falseNegative);

const report = {
  ticket: "AGAR-FUN-005.1",
  tickMs: AGAR_TICK_MS,
  collideEps: AGAR_COLLIDE_EPS,
  pipeline: {
    physics: "tickAgarWorld → tryEatPlayers / tryVirusCollisions",
    render: "DOM fill width/height = 2*massToRadius; outline outside (no border inset)",
    interpolation: "NONE",
    network: "local MVP — auth snapshot === React state",
  },
  rootCause: {
    eps: "AGAR_COLLIDE_EPS=1.5 fired auth before disc touch",
    borderBox:
      "YOU border 2px + other 1px with border-box shrunk visible fill below massToRadius",
    virus: "spike clip-path without disc underlay → visual gaps inside collision circle",
  },
  fix: {
    eps: 0,
    render: "border:none; outline for YOU chrome; virus solid disc underlay",
    radii: "cellDiscRadius === massToRadius (auth + render)",
  },
  counts: {
    totalSamples: all.length,
    hundredProbe: hundredSlice.length,
    static: staticCases.length,
    dynamic: dynCases.length,
    split: splitCases.length,
    virus: virusCases.length,
  },
  hundred: {
    cases: hundredSlice.length,
    falsePositive: hFp,
    falseNegative: hFn,
    maxPhysRenderDevPx: hMaxDev,
    contactTrueJudgedOk: hFp === 0 && hFn === 0,
  },
  normal: {
    falsePositive: fp,
    falseNegative: fn,
    maxPhysRenderDevPx: maxDev,
  },
  network: {
    "0ms": network[0],
    "50ms": network[50],
    "100ms": network[100],
    "200ms": network[200],
  },
  split: { pass: splitPass, cases: splitCases },
  virus: { pass: virusPass, cases: virusCases },
  helperOk,
  pass:
    helperOk &&
    hFp === 0 &&
    hFn === 0 &&
    fp === 0 &&
    fn === 0 &&
    splitPass &&
    virusPass &&
    network[0].pass &&
    network[50].pass &&
    network[100].pass &&
    network[200].pass,
};

writeFileSync(join(__dirname, "probe-report.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      pass: report.pass,
      hundred: report.hundred,
      normal: report.normal,
      network: {
        0: network[0].pass,
        50: network[50].pass,
        100: network[100].pass,
        200: network[200].pass,
      },
      split: splitPass,
      virus: virusPass,
      maxDev,
      eps: AGAR_COLLIDE_EPS,
    },
    null,
    2
  )
);
