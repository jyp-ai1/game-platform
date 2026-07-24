#!/usr/bin/env node
/** Sprint15 Epic3 — run all quality improvement audits. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReport, readPlayableSlugs } from "./lib/common.mjs";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const STATIC = [
  "difficulty-curve.mjs",
  "predict-rankings.mjs",
  "game-review.mjs",
  "metadata-audit.mjs",
  "thumbnail-audit.mjs",
  "audio-audit.mjs",
  "bundle-audit.mjs",
  "dead-code-scan.mjs",
  "duplicate-asset-scan.mjs",
  "verify-50-games.mjs",
  "analytics-verify.mjs",
];

const SERVER = ["loading-times.mjs", "broken-assets.mjs"];

function run(script, extraEnv = {}) {
  const r = spawnSync("node", [path.join(REPO, "tools/qa", script)], {
    cwd: REPO,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });
  return r.status === 0;
}

async function main() {
  console.log("Quality Improvement Sprint — Epic3\n");
  let failed = 0;

  for (const s of STATIC) {
    console.log(`\n▶ ${s}`);
    if (!run(s)) failed++;
  }

  if (process.env.QA_SKIP_SERVER === "0") {
    for (const s of SERVER) {
      console.log(`\n▶ ${s}`);
      if (!run(s, { QA_SKIP_SERVER: "0" })) failed++;
    }
  } else {
    console.log("\n▶ server audits skipped (set QA_SKIP_SERVER=0 with live server)");
    const slugs = await readPlayableSlugs();
    const skipNote = "Server audit skipped — run QA_SKIP_SERVER=0 with live server";
    await writeReport("loading-times.json", {
      generatedAt: new Date().toISOString(),
      overall: "SKIP",
      passCount: 0,
      total: slugs.length,
      note: skipNote,
      games: [],
    });
    await writeReport("broken-assets.json", {
      generatedAt: new Date().toISOString(),
      overall: "SKIP",
      pagesChecked: 0,
      broken404: 0,
      brokenImages: 0,
      brokenLinks: 0,
      note: skipNote,
    });
  }

  console.log("\n▶ build-release-dashboard.mjs");
  if (!run("build-release-dashboard.mjs")) failed++;

  console.log(failed ? `\nEpic3: ${failed} step(s) failed` : "\nEpic3: PASS");
  process.exit(failed ? 1 : 0);
}

main();
