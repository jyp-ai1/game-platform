#!/usr/bin/env node
/**
 * CPO 2차 QA — platform multiplayer harness entrypoint.
 *
 * Usage:
 *   npm run qa:mp
 *   QA_BASE_URL=https://game29-xxx.vercel.app QA_COMMIT=abc123 npm run qa:mp
 *
 * Modules (individual):
 *   node tools/qa/mp-cto-cpo-qa-010.mjs   — full P0 gate (Bomber dual-context + mobile + regression)
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.QA_BASE_URL ?? "https://game29.vercel.app";
const COMMIT = process.env.QA_COMMIT ?? "local";

console.log("=== MP Platform QA (CPO runnable) ===");
console.log(`BASE=${BASE}`);
console.log(`COMMIT=${COMMIT}`);
console.log("");

const env = { ...process.env, QA_BASE_URL: BASE, QA_COMMIT: COMMIT };
const r = spawnSync("node", ["tools/qa/mp-cto-cpo-qa-010.mjs"], {
  cwd: ROOT,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

console.log("");
console.log("Evidence: docs/qa/cpo/mp-cto-cpo-qa-010/");
console.log("CPO guide: docs/qa/cpo/CPO-TEST-PLAN.md");
process.exit(r.status ?? 1);
