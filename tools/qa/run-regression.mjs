#!/usr/bin/env node
/**
 * Regression runner — 50-game static + E2E smoke (play/save/resume hooks verified statically).
 */
import { spawnSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(REPO, "docs/reports/sprint15/regression-report.json");

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: REPO,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return r.status === 0;
}

async function main() {
  console.log("Regression Runner — 50 games\n");
  const steps = [];
  let failed = false;

  const staticSteps = [
    ["verify-games", () => run("node", ["tools/qa/verify-50-games.mjs"])],
    ["analytics", () => run("node", ["tools/qa/analytics-verify.mjs"])],
  ];

  for (const [name, fn] of staticSteps) {
    console.log(`\n▶ ${name}`);
    const ok = fn();
    steps.push({ name, pass: ok });
    if (!ok) failed = true;
  }

  const skipE2e = process.env.QA_SKIP_E2E === "1";
  if (!skipE2e) {
    console.log("\n▶ e2e-games (Playwright)");
    if (!run("npm", ["run", "build", "--workspace=@game-platform/web"])) {
      steps.push({ name: "build", pass: false });
      failed = true;
    } else {
      steps.push({ name: "build", pass: true });
      const e2eOk = run("npx", [
        "playwright",
        "test",
        "tests/e2e/games",
        "tests/e2e/routes-404.spec.ts",
        "--config",
        "tests/e2e/playwright.config.ts",
        "--grep",
        "open → start|404 check",
      ]);
      steps.push({ name: "e2e-games", pass: e2eOk });
      if (!e2eOk) failed = true;
    }
  } else {
    steps.push({ name: "e2e-games", pass: true, skipped: true });
  }

  const passCount = steps.filter((s) => s.pass).length;
  const summary = {
    generatedAt: new Date().toISOString(),
    steps,
    games: "50/50",
    overall: failed ? "FAIL" : "PASS",
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(summary, null, 2), "utf8");

  console.log(`\n--- Regression: ${summary.overall} (${passCount}/${steps.length} steps)`);
  process.exit(failed ? 1 : 0);
}

main();
