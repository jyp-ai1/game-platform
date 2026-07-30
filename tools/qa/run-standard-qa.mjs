#!/usr/bin/env node
/**
 * Sprint 14 — STRICT standard QA gate (50/50 PASS required before Commit → Push).
 * Checks: Stage, Difficulty, Progress, Sound, Effect, Result, Retry, Exit, Save
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT_JSON = path.join(REPO, "docs/reports/sprint14/standard-qa.json");
const OUT_MD = path.join(REPO, "docs/reports/sprint14/standard-qa.md");

/** Per-game checks (all must pass). */
const GAME_CHECKS = [
  {
    id: "stage",
    label: "Stage",
    patterns: [
      /useStandardGameFeel\s*\(/,
      /stageIndex\s*:/,
      /getGroupDifficulty\s*\(/,
      /ScoreBox label=["']Stage/,
      /tileStageIndex|getBubbleStage|getMemoryStage|TILE_STAGES/,
      /label=["']Round|label=["']Level|label=["']Wave|label=["']Frame/,
    ],
    any: true,
  },
  {
    id: "difficulty",
    label: "Difficulty",
    patterns: [
      /getGroupDifficulty\s*\(/,
      /diff\.speedMult/,
      /roundDurationFor|spawnChance|gravityIntervalMs/,
      /shotsPerCeilingDrop|flyingSpeed|AI_MAX_SPEED/,
    ],
    any: true,
  },
  {
    id: "progress",
    label: "Progress",
    patterns: [/useStandardGameFeel\s*\(/, /useGameSession\s*\(/, /reportScore\s*\(/],
    any: true,
  },
  {
    id: "sound",
    label: "Sound",
    patterns: [/useStandardGameFeel\s*\(/, /play\w+Sound\s*\(/],
    any: true,
  },
  {
    id: "effect",
    label: "Effect",
    patterns: [/useStandardGameFeel\s*\(/, /triggerEffect\s*\(/, /fieldRef/],
    any: true,
  },
  {
    id: "result",
    label: "Result",
    patterns: [/StandardGameOverOverlay/],
    any: false,
  },
  {
    id: "retry",
    label: "Retry",
    patterns: [/onRetry\s*=|emitGameRetry\s*\(/],
    any: true,
  },
  {
    id: "exit",
    label: "Exit",
    patterns: [/feel\.handleExit|onExit=\{feel\.handleExit\}/],
    any: true,
  },
  {
    id: "save",
    label: "Save",
    patterns: [/useAutoSave\s*\(/, /SaveIndicator/],
    any: true,
  },
];

const PLATFORM_CHECKS = [
  { id: "progress_hud", file: "apps/web/components/game-player.tsx", patterns: [/GameProgressBar/] },
  { id: "difficulty_hud", file: "apps/web/components/game-progress-bar.tsx", patterns: [/getGroupDifficulty/] },
  { id: "slug_provider", file: "apps/web/components/game-player.tsx", patterns: [/GameSlugProvider/] },
];

async function readGameSrc(slug) {
  const dir = path.join(REPO, "games", slug, "src");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
  return (await Promise.all(files.map((f) => readFile(path.join(dir, f), "utf8")))).join("\n");
}

function runGameChecks(src) {
  const checks = {};
  const missing = [];
  for (const c of GAME_CHECKS) {
    const ok = c.any
      ? c.patterns.some((p) => p.test(src))
      : c.patterns.every((p) => p.test(src));
    checks[c.id] = ok;
    if (!ok) missing.push(c.id);
  }
  return { checks, missing };
}

function status(missing) {
  if (missing.length === 0) return "PASS";
  if (missing.length <= 2) return "WARN";
  return "FAIL";
}

async function main() {
  const playable = await readFile(path.join(REPO, "apps/web/lib/playable-games.ts"), "utf8");
  const slugs = playable.match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
  const sdkFeel = await readFile(
    path.join(REPO, "packages/game-sdk/src/use-standard-game-feel.ts"),
    "utf8"
  );
  const sdkDifficultyInFeel = /getGroupDifficulty/.test(sdkFeel);

  const platform = {};
  for (const c of PLATFORM_CHECKS) {
    const src = await readFile(path.join(REPO, c.file), "utf8");
    platform[c.id] = c.patterns.every((p) => p.test(src));
  }

  const games = [];
  for (const slug of slugs) {
    let src = "";
    try {
      src = await readGameSrc(slug);
    } catch {
      games.push({ slug, status: "FAIL", missing: ["source"], checks: {} });
      continue;
    }

    // Platform HUD supplements progress display; difficulty must exist in game engine or hook.
    const { checks, missing } = runGameChecks(src);
    if (!checks.difficulty && sdkDifficultyInFeel && /useStandardGameFeel\s*\(/.test(src)) {
      checks.difficulty = true;
      const idx = missing.indexOf("difficulty");
      if (idx >= 0) missing.splice(idx, 1);
    }

    games.push({ slug, status: status(missing), missing, checks });
  }

  const pass = games.filter((g) => g.status === "PASS").length;
  const warn = games.filter((g) => g.status === "WARN").length;
  const fail = games.filter((g) => g.status === "FAIL").length;
  const gatePass = pass === slugs.length && Object.values(platform).every(Boolean);

  const report = {
    generatedAt: new Date().toISOString(),
    gate: gatePass ? "PASS" : "FAIL",
    requirement: "50/50 PASS — no WARN/FAIL allowed for Commit → Push",
    summary: { total: slugs.length, pass, warn, fail },
    platform,
    sdkDifficultyInFeel,
    games,
    failList: games.filter((g) => g.status !== "PASS").map((g) => ({ slug: g.slug, status: g.status, missing: g.missing })),
  };

  await mkdir(path.dirname(OUT_JSON), { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(report, null, 2));

  const md = `# Sprint 14 — Standard QA (Strict Gate)

**Generated:** ${report.generatedAt}  
**Gate:** **${report.gate}** (${pass}/${slugs.length} PASS · ${warn} WARN · ${fail} FAIL)

## Platform
${Object.entries(platform).map(([k, v]) => `- ${k}: ${v ? "✅" : "❌"}`).join("\n")}

## FAIL / WARN Games
${report.failList.length === 0 ? "None — all PASS" : report.failList.map((g) => `- **${g.slug}** [${g.status}]: ${g.missing.join(", ")}`).join("\n")}

## PM Checklist (after Preview deploy)
- [ ] Home → each game loads without crash
- [ ] START countdown → PLAY
- [ ] Sound on score/action · Effect on clear/over
- [ ] Result overlay · Retry · Exit
- [ ] Save/resume · Progress HUD (Best/Stage/Plays)
- [ ] Mobile responsive
`;

  await writeFile(OUT_MD, md);
  console.log(`Standard QA Gate: ${report.gate} (${pass}/${slugs.length} PASS, ${warn} WARN, ${fail} FAIL)`);
  if (!gatePass) {
    console.log("FAIL/WARN:", report.failList.map((g) => `${g.slug}[${g.status}]:${g.missing.join("+")}`).join(" | "));
    process.exit(1);
  }
}

main();
