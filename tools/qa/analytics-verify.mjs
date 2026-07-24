#!/usr/bin/env node
/** Analytics verify — static code scan + optional runtime note. */
import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(REPO, "docs/reports/sprint15/analytics-verify.json");

async function main() {
  const staticResult = spawnSync("node", ["tools/analytics/generate-validation-report.mjs"], {
    cwd: REPO,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  let matrix = { pass: 0, total: 50 };
  try {
    const md = await readFile(
      path.join(REPO, "docs/reports/sprint15/analytics-matrix.md"),
      "utf8"
    );
    const m = md.match(/(\d+)\/50 PASS/);
    if (m) matrix.pass = Number(m[1]);
  } catch {
    /* ignore */
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    staticScan: staticResult.status === 0 ? "PASS" : "FAIL",
    passCount: matrix.pass,
    total: 50,
    eventsChecked: [
      "session_start",
      "game_start",
      "game_end",
      "game_start(retry)",
      "favorite",
      "ranking_submit",
    ],
    runtimeNote: "Run `npm run test:e2e -- tests/e2e/analytics.spec.ts` with live server for RPC capture",
    overall: staticResult.status === 0 && matrix.pass === 50 ? "PASS" : "FAIL",
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(summary, null, 2), "utf8");
  console.log(`Analytics verify: ${summary.passCount}/50 · ${summary.overall}`);
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

main();
