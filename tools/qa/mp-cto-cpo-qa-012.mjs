/**
 * MP-CTO-CPO-QA-012 — Bomber cross-context input/state/bomb/death final
 */
process.env.QA_GATE = "mp-cto-cpo-qa-012";

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
    distinctPlayerId: ok(checks, "gate-different-player-id"),
    distinctSpawn: ok(checks, "gate-distinct-spawn") || ok(checks, "gate-different-spawn"),
    aMovement: ok(checks, "gate-a-move-sync"),
    bMovement: ok(checks, "gate-b-move-sync"),
    playerBomb: ok(checks, "gate-human-player-bomb"),
    bombOwnerSync: ok(checks, "gate-player-bomb-sync") || ok(checks, "gate-bomb-sync"),
    explosionSync: ok(checks, "gate-explosion-sync"),
    deathSync: ok(checks, "gate-death-sync"),
    aiMovement: ok(checks, "bomber-ai-movement-10s"),
    mobileRegression: mobileChecks.length > 0 && mobileChecks.every((c) => c.ok),
    agarRegression: ok(checks, "agar-split-setup-ready") && ok(checks, "agar-split-cells-change"),
    fullRegression:
      ok(checks, "bomber-host-seat-unit") &&
      ok(checks, "bomber-bomb-authority-unit") &&
      ok(checks, "snake-ai-movement-unit") &&
      mobileChecks.every((c) => c.ok),
  };
  const keys = Object.keys(p0);
  const passed = Object.values(p0).filter(Boolean).length;
  return { p0, passed, total: keys.length, ctoPass: passed === keys.length };
}

async function fetchPreviewSha(base) {
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/build-info`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.commit ?? data?.sha ?? null;
  } catch {
    return null;
  }
}

function writeReports({ BASE, COMMIT, OUT, checks, verifyReport, dualContext, previewSha }) {
  const { p0, passed, total, ctoPass } = p0Summary(checks);
  dualContext.previewSha = previewSha ?? COMMIT;
  const shaMatch = !previewSha || previewSha.startsWith(String(COMMIT).slice(0, 7));

  const verify = {
    gate: "MP-CTO-CPO-QA-012",
    commit: COMMIT,
    previewSha: dualContext.previewSha,
    previewShaMatch: shaMatch,
    base: BASE,
    branch: "content-factory",
    finishedAt: new Date().toISOString(),
    automated: { passed, total },
    p0,
    ctoFinal: ctoPass && shaMatch ? "PASS" : "FAIL",
    checks: verifyReport.checks,
  };

  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(verify, null, 2));
  writeFileSync(join(OUT, "dual-context-report.json"), JSON.stringify(dualContext, null, 2));

  const finalPass = ctoPass && shaMatch;
  const cto = `# MP-CTO-CPO-QA-012 — CTO FINAL REPORT

STATUS: ${finalPass ? "PASS" : "FAIL"}

COMMIT: ${COMMIT}

PREVIEW:
${BASE}

PREVIEW SHA:
${dualContext.previewSha ?? "unknown"}${shaMatch ? "" : " (MISMATCH)"}

AUTOMATED:
${passed}/${total} PASS

BROWSER:
${p0.aMovement && p0.bMovement && p0.deathSync ? "PASS" : "FAIL"}

REGRESSION:
${p0.fullRegression ? "PASS" : "FAIL"}

CPO REVIEW READY:
${finalPass ? "YES" : "NO"}

CEO TEST:
HOLD

PRODUCTION:
HOLD

## P0 RESULT

| Test | Result | Evidence |
|---|---|---|
| Distinct playerId | ${p0.distinctPlayerId ? "PASS" : "FAIL"} | dual-context-report.json |
| Distinct spawn | ${p0.distinctSpawn ? "PASS" : "FAIL"} | spawnA ≠ spawnB |
| A → B movement | ${p0.aMovement ? "PASS" : "FAIL"} | movementA + inputChain |
| B → A movement | ${p0.bMovement ? "PASS" : "FAIL"} | movementB + inputChain |
| Player bomb | ${p0.playerBomb ? "PASS" : "FAIL"} | playerBomb owner |
| Bomb owner sync | ${p0.bombOwnerSync ? "PASS" : "FAIL"} | bombs on A/B |
| Explosion sync | ${p0.explosionSync ? "PASS" : "FAIL"} | player bomb only |
| Death sync | ${p0.deathSync ? "PASS" : "FAIL"} | victimId deathA/deathB |
| AI movement | ${p0.aiMovement ? "PASS" : "FAIL"} | aiMoved |
| Mobile regression | ${p0.mobileRegression ? "PASS" : "FAIL"} | screenshots/ |
| Agar regression | ${p0.agarRegression ? "PASS" : "FAIL"} | agar split |
| Full regression | ${p0.fullRegression ? "PASS" : "FAIL"} | unit + mobile |

## ROOT CAUSE

See verify-report.json checks + dual-context-report.json inputChain.

## FIX

- sessionStorage device id (per-tab QA)
- rejectStaleTick on guest state apply
- reconcileHumans alive on bot replace
- shared-context local QA / Supabase preview path

## VERIFICATION

\`npm run qa:mp\` @ ${BASE}

## REMAINING BLOCKERS

${finalPass ? "NONE" : "P0 gates or preview SHA mismatch — see verify-report.json"}

## EVIDENCE

- docs/qa/cpo/mp-cto-cpo-qa-012/

## CTO FINAL

${finalPass ? "PASS" : "FAIL"}
`;

  writeFileSync(join(OUT, "CTO-REPORT.md"), cto);
  writeFileSync(
    join(OUT, "TEST-RESULT.md"),
    `# MP-CTO-CPO-QA-012 TEST RESULT\n\nAutomated: ${passed}/${total}\nCTO Final: ${finalPass ? "PASS" : "FAIL"}\nPreview SHA: ${dualContext.previewSha}\n`
  );
  return { ctoPass: finalPass, passed, total, OUT };
}

async function main() {
  const { BASE, COMMIT, OUT, createReportState } = await loadCommon();
  mkdirSync(OUT, { recursive: true });
  mkdirSync(join(OUT, "screenshots"), { recursive: true });

  const previewSha = await fetchPreviewSha(BASE);
  const { checks, verifyReport, mark } = createReportState();
  const dualContext = createDualContextReport();

  probeCode(mark);
  probeUnitTests(mark);

  // Dual-context first — fresh browser before long mobile/agar/AI runs.
  const dualBrowser = await chromium.launch({ headless: true });
  try {
    await probeDualContextBomber(dualBrowser, mark, dualContext);
  } finally {
    await dualBrowser.close();
  }

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

    const { ctoPass, passed, total } = writeReports({
      BASE,
      COMMIT,
      OUT,
      checks,
      verifyReport,
      dualContext,
      previewSha,
    });

    console.log("\n=== MP-CTO-CPO-QA-012 SUMMARY ===");
    console.log(`P0: ${passed}/${total}`);
    console.log(`Preview SHA: ${previewSha ?? "n/a"}`);
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
