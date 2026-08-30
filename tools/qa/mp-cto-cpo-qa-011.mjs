/**
 * MP-CTO-CPO-QA-011 — Bomber dual-context sync final + CTO 1차 QA
 */
process.env.QA_GATE = "mp-cto-cpo-qa-011";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  createDualContextReport,
  probeBomberAiMovement,
  probeDualContextBomber,
} from "./bomber-dual-context.mjs";
import { runMobileRegression } from "./mp-mobile.mjs";
import { probeAgarSplit, probeCode, probeUnitTests } from "./regression.mjs";

async function loadCommon() {
  return import("./lib/mp-common.mjs");
}

function ok(checks, name) {
  return checks.find((c) => c.name === name)?.ok ?? false;
}

function p0Summary(checks) {
  const mobileChecks = checks.filter(
    (c) =>
      c.name.includes("mobile") ||
      c.name.includes("floating") ||
      c.name.startsWith("snake-mobile") ||
      c.name.startsWith("agar-mobile") ||
      c.name.startsWith("bomber-mobile")
  );
  const p0 = {
    sameRoom: ok(checks, "gate-same-room"),
    differentPlayerId: ok(checks, "gate-different-player-id"),
    differentSeat: ok(checks, "gate-different-seat"),
    differentSpawn: ok(checks, "gate-different-spawn") || ok(checks, "gate-distinct-spawn"),
    aMovementSync: ok(checks, "gate-a-move-sync"),
    bMovementSync: ok(checks, "gate-b-move-sync"),
    playerBomb: ok(checks, "gate-human-player-bomb") || ok(checks, "gate-player-bomb-sync"),
    bombSync: ok(checks, "gate-bomb-sync") || ok(checks, "gate-player-bomb-sync"),
    explosionSync: ok(checks, "gate-explosion-sync"),
    deathSync: ok(checks, "gate-death-sync"),
    aiMovement: ok(checks, "bomber-ai-movement-10s"),
    mobileRegression: mobileChecks.length > 0 && mobileChecks.every((c) => c.ok),
  };
  const passed = Object.values(p0).filter(Boolean).length;
  return { p0, passed, total: 12, ctoPass: passed === 12 };
}

function writeReports({ BASE, COMMIT, OUT, checks, verifyReport, dualContext }) {
  const { p0, passed, total, ctoPass } = p0Summary(checks);
  const finishedAt = new Date().toISOString();

  const verify = {
    gate: "MP-CTO-CPO-QA-011",
    commit: COMMIT,
    base: BASE,
    branch: "content-factory",
    finishedAt,
    automated: { passed, total },
    p0,
    ctoFinal: ctoPass ? "PASS" : "FAIL",
    regression: {
      agarSplit: ok(checks, "agar-split-setup-ready") && ok(checks, "agar-split-cells-change"),
      unit:
        ok(checks, "bomber-host-seat-unit") &&
        ok(checks, "bomber-bomb-authority-unit") &&
        ok(checks, "snake-ai-movement-unit"),
    },
    checks: verifyReport.checks,
  };

  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(verify, null, 2));
  writeFileSync(join(OUT, "dual-context-report.json"), JSON.stringify(dualContext, null, 2));

  const rows = [
    ["Same Room", p0.sameRoom, "dual-context-report.json roomId"],
    ["Different playerId", p0.differentPlayerId, "playerA.id ≠ playerB.id"],
    ["Different seat", p0.differentSeat, "playerA.seat ≠ playerB.seat"],
    ["Different spawn", p0.differentSpawn, "spawn coords"],
    ["A movement sync", p0.aMovementSync, "movementSync.aToB"],
    ["B movement sync", p0.bMovementSync, "movementSync.bToA"],
    ["Human player bomb", p0.playerBomb, "bomb.playerBombOnly"],
    ["Bomb sync", p0.bombSync, "bomb owner+position on B"],
    ["Explosion sync", p0.explosionSync, "explosion both contexts"],
    ["Death sync", p0.deathSync, "deathSync chain"],
    ["AI 10s movement", p0.aiMovement, "aiMoved"],
    ["Mobile regression", p0.mobileRegression, "screenshots/"],
  ];

  const failed = rows.filter((r) => !r[1]).map((r) => r[0]);

  const cto = `# MP-CTO-CPO-QA-011

## Build

- Commit: ${COMMIT}
- Branch: content-factory
- Preview: ${BASE}
- Date: ${finishedAt}

## CTO Final

${ctoPass ? "PASS" : "FAIL"}

## Automated QA

${passed}/${total} PASS

## P0 Results

| Test | Result | Evidence |
|---|---|---|
${rows.map(([t, r, e]) => `| ${t} | ${r ? "PASS" : "FAIL"} | ${e} |`).join("\n")}

## Root Cause

${
  ctoPass
    ? "None — all P0 gates passed."
    : failed.join(", ") +
      " — reconcileHumans was resetting positions every tick; guest inputs could be dropped between state events."
}

## Fix

- reconcileHumans: overlap-only seat pin (movement persists)
- Host tick: drain all input:* keys from gameState with timestamp dedupe
- Guest pushInput: sync() after send for faster cross-context delivery
- QA: remote position polling + death chain wait loop

## Regression

- Agar split: ${verify.regression.agarSplit ? "PASS" : "FAIL"}
- Unit tests: ${verify.regression.unit ? "PASS" : "FAIL"}

## Remaining Issues

${failed.length ? failed.map((f) => `- ${f}`).join("\n") : "None"}

## Recommendation

${ctoPass ? "READY_FOR_CPO" : "NOT_READY_FOR_CPO"}

**CPO Review Ready:** ${ctoPass ? "YES" : "NO"}
**CEO Test:** HOLD
**Production:** HOLD
`;

  writeFileSync(join(OUT, "CTO-REPORT.md"), cto);
  return { ctoPass, passed, total, OUT };
}

async function main() {
  const { BASE, COMMIT, OUT, createReportState } = await loadCommon();
  mkdirSync(OUT, { recursive: true });
  mkdirSync(join(OUT, "screenshots"), { recursive: true });

  const { checks, verifyReport, mark } = createReportState();
  const dualContext = createDualContextReport();

  probeCode(mark);
  probeUnitTests(mark);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ hasTouch: true });
  const page = await ctx.newPage();

  try {
    await runMobileRegression(browser, mark);
    await probeAgarSplit(page, mark);

    const aiPage = await ctx.newPage();
    try {
      await probeBomberAiMovement(aiPage, mark, dualContext);
    } finally {
      await aiPage.close();
    }

    await probeDualContextBomber(browser, mark, dualContext);

    const { ctoPass, passed, total } = writeReports({
      BASE,
      COMMIT,
      OUT,
      checks,
      verifyReport,
      dualContext,
    });

    console.log("\n=== MP-CTO-CPO-QA-011 SUMMARY ===");
    console.log(`P0: ${passed}/${total}`);
    console.log(`CTO FINAL: ${ctoPass ? "PASS" : "FAIL"}`);
    console.log(`Evidence: ${OUT}`);
    process.exit(ctoPass ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
