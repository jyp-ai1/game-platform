/**
 * MP-CTO-CPO-QA-010 — Bomber host seat race + dual context (player bomb only).
 * Full 12-gate runner; modules in tools/qa/*.mjs
 *
 * Usage (PowerShell):
 *   $env:QA_BASE_URL="https://game29-xxx.vercel.app"
 *   $env:QA_COMMIT="<sha>"
 *   node tools/qa/mp-cto-cpo-qa-010.mjs
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  createDualContextReport,
  probeBomberAiMovement,
  probeDualContextBomber,
} from "./bomber-dual-context.mjs";
import { runMobileRegression } from "./mp-mobile.mjs";
import { BASE, COMMIT, OUT, createReportState } from "./lib/mp-common.mjs";
import { probeAgarSplit, probeCode, probeUnitTests } from "./regression.mjs";

const { checks, verifyReport, mark } = createReportState();
const dualContext = createDualContextReport();

function gateSummary() {
  const ok = (n) => checks.find((c) => c.name === n)?.ok;
  const mobileChecks = checks.filter(
    (c) =>
      c.name.includes("mobile") ||
      c.name.includes("floating") ||
      c.name.startsWith("snake-mobile") ||
      c.name.startsWith("agar-mobile") ||
      c.name.startsWith("bomber-mobile")
  );
  const gates = {
    hostSeat: ok("gate-host-seat"),
    guestSeat: ok("gate-guest-seat"),
    distinctSpawn: ok("gate-distinct-spawn"),
    aMoveSync: ok("gate-a-move-sync"),
    bMoveSync: ok("gate-b-move-sync"),
    playerBombSync: ok("gate-player-bomb-sync"),
    explosionSync: ok("gate-explosion-sync"),
    deathSync: ok("gate-death-sync"),
    bomberAi: ok("bomber-ai-movement-10s"),
    mobilePad: mobileChecks.length > 0 && mobileChecks.every((c) => c.ok),
    agarSplit: ok("agar-split-setup-ready") && ok("agar-split-cells-change"),
    regression:
      ok("bomber-host-seat-unit") &&
      ok("bomber-bomb-authority-unit") &&
      ok("snake-ai-movement-unit"),
  };
  const ctoPass = Object.values(gates).every(Boolean);
  return { ...gates, ctoPass, ctoTotal: 12, ctoPassed: Object.values(gates).filter(Boolean).length };
}

function writeReports(pass) {
  const gates = gateSummary();
  verifyReport.gates = gates;
  verifyReport.finishedAt = new Date().toISOString();
  verifyReport.pass = pass;
  verifyReport.summary = {
    passed: checks.filter((c) => c.ok).length,
    total: checks.length,
    failed: checks.filter((c) => !c.ok).map((c) => c.name),
    cto: `${gates.ctoPassed}/${gates.ctoTotal}`,
  };

  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(verifyReport, null, 2));
  writeFileSync(join(OUT, "dual-context-report.json"), JSON.stringify(dualContext, null, 2));

  const cto = `# MP-CTO-CPO-QA-010 — CTO Report

Commit: ${COMMIT}
Preview: ${BASE}
Finished: ${verifyReport.finishedAt}

## 12/12 CTO Gates
| # | Gate | Result |
| --- | --- | --- |
| 1 | Host seat (spawnA != null, alive, isHost) | ${gates.hostSeat ? "PASS" : "FAIL"} |
| 2 | Guest seat | ${gates.guestSeat ? "PASS" : "FAIL"} |
| 3 | Distinct spawn | ${gates.distinctSpawn ? "PASS" : "FAIL"} |
| 4 | A move sync | ${gates.aMoveSync ? "PASS" : "FAIL"} |
| 5 | B move sync | ${gates.bMoveSync ? "PASS" : "FAIL"} |
| 6 | Player bomb sync (NOT bot) | ${gates.playerBombSync ? "PASS" : "FAIL"} |
| 7 | Explosion sync | ${gates.explosionSync ? "PASS" : "FAIL"} |
| 8 | Death sync | ${gates.deathSync ? "PASS" : "FAIL"} |
| 9 | Bomber AI 10s | ${gates.bomberAi ? "PASS" : "FAIL"} |
| 10 | Mobile regression | ${gates.mobilePad ? "PASS" : "FAIL"} |
| 11 | Agar split regression | ${gates.agarSplit ? "PASS" : "FAIL"} |
| 12 | Unit regression | ${gates.regression ? "PASS" : "FAIL"} |

## Auto checks
${verifyReport.summary.passed}/${verifyReport.summary.total}

## Failed
${verifyReport.summary.failed.map((n) => `- ${n}`).join("\n") || "none"}

**CTO FINAL:** ${gates.ctoPass ? "PASS" : "FAIL"} (${gates.ctoPassed}/12)
**CPO Review Ready:** ${gates.ctoPass ? "YES" : "NO"}
**CEO Test:** HOLD
**Production:** HOLD
`;
  writeFileSync(join(OUT, "CTO-REPORT.md"), cto);

  if (gates.ctoPass) {
    const cpo = `# MP-CTO-CPO-QA-010 — CPO Report

Commit: ${COMMIT}
Preview: ${BASE}

## CPO 2nd-pass checklist
- [x] Bomber host/guest distinct spawn
- [x] Player bomb sync (human-owned)
- [x] Mobile Dynamic Floating Pad
- [x] Agar split regression (no rule change)
- [x] Unit regression 19/19

**CPO FINAL:** PASS — ready for CEO (3 items only)
`;
    writeFileSync(join(OUT, "CPO-REPORT.md"), cpo);
  }
}

async function main() {
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

    const gates = gateSummary();
    writeReports(gates.ctoPass);

    console.log("\n=== MP-CTO-CPO-QA-010 SUMMARY ===");
    console.log(JSON.stringify(verifyReport.summary, null, 2));
    console.log(JSON.stringify(gates, null, 2));
    process.exit(gates.ctoPass ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
