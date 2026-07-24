#!/usr/bin/env node
/** RC1 developer preflight — static checks without live server. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const STEPS = [
  { name: "lint", cmd: "npm", args: ["run", "lint", "--workspace=@game-platform/web"] },
  { name: "typecheck", cmd: "npm", args: ["run", "typecheck", "--workspace=@game-platform/web"] },
  { name: "verify-games", cmd: "node", args: ["tools/qa/verify-50-games.mjs"] },
  { name: "analytics-validate", cmd: "node", args: ["tools/analytics/generate-validation-report.mjs"] },
];

function runStep(step) {
  const result = spawnSync(step.cmd, step.args, {
    cwd: REPO,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

async function main() {
  console.log("RC1 Preflight — static developer checks\n");
  const failed = [];

  for (const step of STEPS) {
    console.log(`\n▶ ${step.name}`);
    if (!runStep(step)) {
      failed.push(step.name);
    }
  }

  console.log("\n---");
  if (failed.length) {
    console.error(`Preflight FAIL: ${failed.join(", ")}`);
    process.exit(1);
  }
  console.log("Preflight PASS — ready for QA handoff");
}

main();
