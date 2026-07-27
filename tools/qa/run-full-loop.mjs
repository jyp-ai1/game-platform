#!/usr/bin/env node
/**
 * Sprint 13 — Tier B full loop QA collector.
 * FAIL-first · no fixes · writes docs/reports/full-loop/YYYY-MM-DD.md
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATE = process.env.QA_FULL_LOOP_DATE ?? new Date().toISOString().slice(0, 10);

function run(cmd, args) {
  return spawnSync(cmd, args, {
    cwd: REPO,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      QA_FULL_LOOP_DATE: DATE,
    },
  });
}

console.log("Sprint 13 Full Loop QA — Tier B collect");
console.log(`Date: ${DATE}`);
console.log("Mode: FAIL-first (no auto-fix)\n");

const pw = run("npx", [
  "playwright",
  "test",
  "tests/e2e/games/full-loop-tier-b.spec.ts",
  "--config",
  "tests/e2e/playwright.config.ts",
  "--grep",
  "collect all Tier B",
]);

const reportPath = path.join(REPO, "docs/reports/full-loop", DATE, `${DATE}.md`);
console.log(`\nReport: ${reportPath}`);
// Collect mode: exit 0 when runner finished (FAIL counts are in the report)
process.exit(pw.status === 0 || pw.status === 1 ? 0 : pw.status ?? 1);
