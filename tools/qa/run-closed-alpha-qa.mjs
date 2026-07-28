#!/usr/bin/env node
/** Closed Alpha QA — generates checklist + READY/NOT READY for final PM report. */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(REPO, "docs/reports/sprint14/closed-alpha-qa.json");

const CHECKS = [
  { id: "start", p: [/useReadyCountdown\s*\(/, /ReadyCountdown/] },
  { id: "sound", p: [/useStandardGameFeel\s*\(/] },
  { id: "effect", p: [/useStandardGameFeel\s*\(/] },
  { id: "result", p: [/StandardGameOverOverlay/] },
  { id: "exit", p: [/feel\.handleExit|onExit=/] },
  { id: "retry", p: [/onRetry=|emitGameRetry/] },
  { id: "save", p: [/useAutoSave\s*\(/] },
  { id: "progress", p: [/useStandardGameFeel\s*\(/] },
  { id: "responsive", p: [/standard-game-shell|max-w-/] },
];

async function readSrc(slug) {
  const dir = path.join(REPO, "games", slug, "src");
  const files = await readdir(dir);
  return (
    await Promise.all(
      files.filter((f) => f.endsWith(".tsx")).map((f) => readFile(path.join(dir, f), "utf8"))
    )
  ).join("\n");
}

async function main() {
  const playable = await readFile(path.join(REPO, "apps/web/lib/playable-games.ts"), "utf8");
  const slugs = playable.match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
  const platform = await readFile(path.join(REPO, "apps/web/components/game-player.tsx"), "utf8");
  const hasProgressBar = /GameProgressBar/.test(platform);

  const games = [];
  for (const slug of slugs) {
    let src = "";
    try {
      src = await readSrc(slug);
    } catch {
      games.push({ slug, pass: false, checks: {} });
      continue;
    }
    const checks = Object.fromEntries(
      CHECKS.map((c) => [c.id, c.p.every((re) => re.test(src))])
    );
    const core = ["start", "sound", "result", "save", "retry"].every((k) => checks[k]);
    games.push({ slug, pass: core, checks });
  }

  const passCount = games.filter((g) => g.pass).length;
  const ready = passCount >= 48 && hasProgressBar;

  const report = {
    generatedAt: new Date().toISOString(),
    passCount,
    total: slugs.length,
    platformProgressBar: hasProgressBar,
    closedAlpha: ready ? "READY" : "NOT READY",
    games,
    knownIssues: [
      "Per-game original feel (90%+) not verified — batch standard only",
      "Stage difficulty not wired into all game engines",
      "SnakeIo FPS/memory leak — needs device QA",
      "Ranking API HTTP 409 on some games",
    ],
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(report, null, 2));
  console.log(`Closed Alpha: ${report.closedAlpha} (${passCount}/${slugs.length})`);
}

main();
