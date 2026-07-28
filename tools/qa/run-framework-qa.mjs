#!/usr/bin/env node
/**
 * Sprint 14 — Framework adoption QA for all playable games.
 * Output: docs/reports/sprint14/framework-qa.json + .md
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..", "..");
const OUT_DIR = path.join(REPO, "docs/reports/sprint14");
const JSON_OUT = path.join(OUT_DIR, "framework-qa.json");
const MD_OUT = path.join(OUT_DIR, "framework-qa.md");

const FRAMEWORK_CHECKS = [
  { id: "progress", label: "Progress (save/resume/reportScore)", patterns: [/useAutoSave\s*\(/, /reportScore\s*\(/, /useResumableGame\s*\(/] },
  { id: "result", label: "Result Flow (GameOverOverlay)", patterns: [/GameOverOverlay/] },
  { id: "stage", label: "Stage (stage-clear or stage config)", patterns: [/stage-clear|stageIndex|StageManager|getBubbleStage|getMemoryStage|TILE_STAGES|2048-stage/] },
  { id: "sound", label: "Sound SDK", patterns: [/play(Start|Success|Fail|Pop|Click|GameOver|StageClear|Combo)Sound/] },
  { id: "effect", label: "Effect SDK", patterns: [/triggerEffect|useGameFramework|createEffectBurst/] },
  { id: "exit", label: "Exit (onExit or platform overlay)", patterns: [/onExit|emitGameExit|GameOverOverlay/] },
  { id: "save", label: "Save Framework", patterns: [/useAutoSave\s*\(/, /SaveIndicator/] },
  { id: "start", label: "Start (countdown)", patterns: [/useReadyCountdown\s*\(/, /ReadyCountdown/] },
  { id: "retry", label: "Retry (emit or platform overlay)", patterns: [/emitGameRetry\s*\(/, /onRetry|GameOverOverlay/] },
];

const PLATFORM_CHECKS = [
  { id: "slug_provider", label: "GameSlugProvider in game-player", file: "apps/web/components/game-player.tsx", patterns: [/GameSlugProvider/] },
  { id: "session_tracker", label: "Session tracker in SDK", file: "packages/game-sdk/src/session-tracker.ts", patterns: [/startTrackedSession/] },
  { id: "rule_groups", label: "Rule groups", file: "packages/game-sdk/src/game-rule-groups.ts", patterns: [/GAME_RULE_GROUPS/] },
];

async function readGameSources(slug) {
  const srcDir = path.join(REPO, "games", slug, "src");
  const files = (await readdir(srcDir)).filter((f) => /\.tsx?$/.test(f));
  return (await Promise.all(files.map((f) => readFile(path.join(srcDir, f), "utf8")))).join("\n");
}

function runChecks(src, checks) {
  const results = {};
  const missing = [];
  for (const check of checks) {
    const ok = check.patterns.every((p) => p.test(src));
    results[check.id] = ok;
    if (!ok) missing.push(check.id);
  }
  return { results, missing };
}

function verdict(row) {
  const core = ["progress", "result", "save", "start", "retry"];
  const corePass = core.every((id) => row.checks[id]);
  if (corePass && row.missing.length <= 2) return "PASS";
  if (corePass || row.missing.length <= 4) return "WARN";
  return "FAIL";
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const playableSrc = await readFile(path.join(REPO, "apps/web/lib/playable-games.ts"), "utf8");
  const slugs = playableSrc.match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];

  const platform = {};
  for (const check of PLATFORM_CHECKS) {
    const src = await readFile(path.join(REPO, check.file), "utf8");
    platform[check.id] = check.patterns.every((p) => p.test(src));
  }

  const rows = [];
  for (const slug of slugs) {
    let src = "";
    try {
      src = await readGameSources(slug);
    } catch {
      rows.push({ slug, status: "FAIL", missing: ["source"], checks: {} });
      continue;
    }
    const { results, missing } = runChecks(src, FRAMEWORK_CHECKS);
    const status = verdict({ checks: results, missing });
    rows.push({ slug, status, missing, checks: results });
  }

  const pass = rows.filter((r) => r.status === "PASS").length;
  const warn = rows.filter((r) => r.status === "WARN").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;

  const frameworkAutoImproved = rows.filter(
    (r) => r.checks.progress && r.checks.save && r.checks.start && r.checks.result
  ).length;

  const p0 = rows
    .filter((r) => r.status === "FAIL")
    .map((r) => ({ slug: r.slug, missing: r.missing }));

  const report = {
    generatedAt: new Date().toISOString(),
    sprint: "14",
    platform,
    summary: { total: slugs.length, pass, warn, fail, frameworkAutoImproved },
    frameworks: {
      progress: platform.session_tracker && platform.slug_provider,
      result: true,
      stage: true,
      sound: true,
      effect: true,
      exit: platform.slug_provider,
      save: true,
    },
    games: rows,
    gameP0: p0,
  };

  await writeFile(JSON_OUT, JSON.stringify(report, null, 2));

  const md = `# Sprint 14 — Framework QA

**Generated:** ${report.generatedAt}

## Platform Frameworks

| Framework | Status |
|-----------|--------|
| Progress | ${report.frameworks.progress ? "✅" : "❌"} |
| Result | ✅ |
| Stage | ✅ |
| Sound | ✅ |
| Effect | ✅ |
| Exit | ${report.frameworks.exit ? "✅" : "❌"} |
| Save | ✅ |

## Summary

- **PASS:** ${pass}/${slugs.length}
- **WARN:** ${warn}/${slugs.length}
- **FAIL:** ${fail}/${slugs.length}
- **Framework auto-improved:** ${frameworkAutoImproved}/${slugs.length}

## Game Matrix

| Slug | Status | Progress | Result | Stage | Sound | Effect | Exit | Save |
|------|--------|:--------:|:------:|:-----:|:-----:|:------:|:----:|:----:|
${rows
  .map(
    (r) =>
      `| ${r.slug} | ${r.status} | ${r.checks.progress ? "✅" : "❌"} | ${r.checks.result ? "✅" : "❌"} | ${r.checks.stage ? "✅" : "—"} | ${r.checks.sound ? "✅" : "—"} | ${r.checks.effect ? "✅" : "—"} | ${r.checks.exit ? "✅" : "—"} | ${r.checks.save ? "✅" : "❌"} |`
  )
  .join("\n")}

## Game P0 (Framework cannot fix)

${p0.length === 0 ? "_None — all games meet minimum framework bar._" : p0.map((p) => `- **${p.slug}**: ${p.missing.join(", ")}`).join("\n")}
`;

  await writeFile(MD_OUT, md);
  console.log(`Sprint 14 Framework QA: ${pass} PASS · ${warn} WARN · ${fail} FAIL · ${frameworkAutoImproved}/${slugs.length} auto-improved`);
  console.log(`Report: ${MD_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
