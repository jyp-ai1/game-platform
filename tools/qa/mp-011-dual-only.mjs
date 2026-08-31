/** Fast Bomber dual-context P0 only (6 gates — MP-CTO-019). */
process.env.QA_GATE = process.env.QA_GATE ?? "mp-cto-019";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { createDualContextReport, probeDualContextBomber } from "./bomber-dual-context.mjs";

function p0FromChecks(checks) {
  const ok = (name) => checks.find((c) => c.name === name)?.ok ?? false;
  return {
    distinctSpawn: ok("gate-distinct-spawn"),
    aToBMovement: ok("gate-a-move-sync"),
    bToAMovement: ok("gate-b-move-sync"),
    playerBomb: ok("gate-human-player-bomb"),
    explosionSync: ok("gate-explosion-sync"),
    deathSync: ok("gate-death-sync"),
  };
}

async function main() {
  const { BASE, COMMIT, OUT, createReportState } = await import("./lib/mp-common.mjs");
  mkdirSync(OUT, { recursive: true });
  mkdirSync(join(OUT, "screenshots"), { recursive: true });
  const { checks, mark } = createReportState();
  const dualContext = createDualContextReport();
  const browser = await chromium.launch({ headless: true });
  try {
    await probeDualContextBomber(browser, mark, dualContext);
  } finally {
    await browser.close();
  }

  const p0 = p0FromChecks(checks);
  const p0Values = Object.values(p0);
  const passed = p0Values.filter(Boolean).length;
  const ctoPass = passed === p0Values.length;

  dualContext.previewSha = COMMIT;
  writeFileSync(join(OUT, "dual-context-report.json"), JSON.stringify(dualContext, null, 2));
  writeFileSync(
    join(OUT, "verify-report.json"),
    JSON.stringify(
      {
        gate: process.env.QA_GATE,
        scope: "Bomber Multiplayer Sync Only",
        commit: COMMIT,
        base: BASE,
        finishedAt: new Date().toISOString(),
        p0,
        passed,
        total: p0Values.length,
        ctoFinal: ctoPass ? "PASS" : "FAIL",
        checks,
      },
      null,
      2
    )
  );

  console.log(`\n=== ${process.env.QA_GATE} P0 ${passed}/${p0Values.length} ${ctoPass ? "PASS" : "FAIL"} ===`);
  process.exit(ctoPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
