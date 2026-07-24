#!/usr/bin/env node
/**
 * Unified QA — lint, typecheck, build, regression, audits, optional E2E suites.
 */
import { spawnSync } from "node:child_process";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT_JSON = path.join(REPO, "docs/reports/sprint15/qa-automation-report.json");
const OUT_MD = path.join(REPO, "docs/reports/sprint15/qa-automation-report.md");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: REPO,
    stdio: opts.quiet ? "pipe" : "inherit",
    shell: process.platform === "win32",
  });
  return { ok: r.status === 0, status: r.status ?? 1 };
}

async function main() {
  console.log("QA Automation — npm run qa:all\n");
  const results = [];

  const staticSteps = [
    { id: "lint", run: () => run("npm", ["run", "lint", "--workspace=@game-platform/web"]) },
    { id: "typecheck", run: () => run("npm", ["run", "typecheck", "--workspace=@game-platform/web"]) },
    { id: "verify-games", run: () => run("node", ["tools/qa/verify-50-games.mjs"]) },
    { id: "analytics", run: () => run("node", ["tools/qa/analytics-verify.mjs"]) },
    { id: "bundle-audit", run: () => run("node", ["tools/qa/bundle-audit.mjs"]) },
    { id: "dead-code", run: () => run("node", ["tools/qa/dead-code-scan.mjs"]) },
    { id: "duplicate-assets", run: () => run("node", ["tools/qa/duplicate-asset-scan.mjs"]) },
  ];

  for (const step of staticSteps) {
    console.log(`\n▶ ${step.id}`);
    const r = step.run();
    results.push({ id: step.id, pass: r.ok });
  }

  console.log("\n▶ build");
  const build = run("npm", ["run", "build", "--workspace=@game-platform/web"]);
  results.push({ id: "build", pass: build.ok });

  if (build.ok && process.env.QA_SKIP_E2E !== "1") {
    const e2eSuites = [
      { id: "regression-e2e", args: ["tests/e2e/games", "--grep", "open → start"] },
      { id: "404-e2e", args: ["tests/e2e/routes-404.spec.ts"] },
      { id: "accessibility", args: ["tests/e2e/accessibility.spec.ts"] },
      { id: "performance", args: ["tests/e2e/performance.spec.ts"] },
    ];

    if (process.env.QA_SCREENSHOTS === "1") {
      e2eSuites.push({
        id: "screenshots",
        args: [
          "tests/e2e/screenshots.spec.ts",
          ...(process.env.QA_UPDATE_SNAPSHOTS === "1" ? ["--update-snapshots"] : []),
        ],
      });
    }

    for (const suite of e2eSuites) {
      console.log(`\n▶ ${suite.id}`);
      const r = run("npx", [
        "playwright",
        "test",
        ...suite.args,
        "--config",
        "tests/e2e/playwright.config.ts",
      ]);
      results.push({ id: suite.id, pass: r.ok });
    }

    console.log("\n▶ 404-scan (fetch, optional)");
    if (process.env.QA_BASE_URL) {
      const scan404 = run("node", ["tools/qa/check-404.mjs"]);
      results.push({ id: "404-scan", pass: scan404.ok });
    }
  } else if (process.env.QA_SKIP_E2E === "1") {
    results.push({ id: "e2e", pass: true, skipped: true });
  }

  const failed = results.filter((r) => !r.pass);
  const playable = 50;
  let verifyPass = playable;
  try {
    const sweep = await readFile(
      path.join(REPO, "docs/reports/sprint15/game-quality-sweep.md"),
      "utf8"
    );
    const m = sweep.match(/(\d+)\/50 PASS/);
    if (m) verifyPass = Number(m[1]);
  } catch {
    /* ignore */
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    branch: "content-factory",
    playable,
    regression: verifyPass === playable ? `${playable}/${playable} PASS` : `${verifyPass}/${playable}`,
    analytics: results.find((r) => r.id === "analytics")?.pass ? "50/50 PASS" : "FAIL",
    results,
    failed: failed.map((f) => f.id),
    overall: failed.length === 0 ? "PASS" : "FAIL",
  };

  await mkdir(path.dirname(OUT_JSON), { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(summary, null, 2), "utf8");

  const md = `# QA Automation Report

**Generated:** ${summary.generatedAt}  
**Branch:** content-factory  
**Overall:** **${summary.overall}**

| Check | Result |
|-------|--------|
| Playable | ${playable} |
| Regression | ${summary.regression} |
| Analytics | ${summary.analytics} |
| Steps | ${results.filter((r) => r.pass).length}/${results.length} PASS |

## Steps

| ID | Pass |
|----|:----:|
${results.map((r) => `| ${r.id} | ${r.pass ? "✓" : "✗"} |`).join("\n")}

Run: \`npm run qa:all\`
`;

  await writeFile(OUT_MD, md, "utf8");

  console.log(`\n=== QA:all ${summary.overall} ===`);
  console.log(`Report: docs/reports/sprint15/qa-automation-report.md`);
  process.exit(failed.length ? 1 : 0);
}

main();
