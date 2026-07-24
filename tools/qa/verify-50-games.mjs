#!/usr/bin/env node
/**
 * Static SDK smoke for all 50 playable games.
 * Checks: start, finish, save, resume, restart, ranking hook, analytics hooks.
 * Output: docs/reports/sprint15/game-quality-sweep.md
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..", "..");
const OUT = path.join(REPO, "docs/reports/sprint15/game-quality-sweep.md");
const JSON_OUT = path.join(REPO, "docs/reports/sprint15/game-quality-sweep.json");

const CHECKS = [
  { id: "start", label: "Start (Ready GO)", patterns: [/useReadyCountdown\s*\(/, /ReadyCountdown/] },
  { id: "finish", label: "Finish (reportScore)", patterns: [/reportScore\s*\(/, /GameOverOverlay/] },
  { id: "save", label: "Save", patterns: [/useAutoSave\s*\(/] },
  { id: "resume", label: "Resume", patterns: [/useResumableGame\s*\(/, /ResumeDialog/] },
  { id: "restart", label: "Restart (retry)", patterns: [/emitGameRetry\s*\(/] },
  { id: "ranking", label: "Ranking hook", patterns: [/reportScore\s*\(/] },
  { id: "analytics", label: "Analytics (SDK)", patterns: [/useGameSDK\s*\(/] },
];

const ERROR_GUARD = [
  { id: "error_boundary", label: "GameOverOverlay (finish UX)", patterns: [/GameOverOverlay/] },
  { id: "no_raw_throw", label: "No unguarded throw in render", patterns: [], antiPatterns: [/throw new Error\(/] },
];

async function readGameSources(slug) {
  const srcDir = path.join(REPO, "games", slug, "src");
  const files = (await readdir(srcDir)).filter((f) => /\.tsx?$/.test(f));
  return (await Promise.all(files.map((f) => readFile(path.join(srcDir, f), "utf8")))).join("\n");
}

function runChecks(src, checks) {
  const missing = [];
  for (const check of checks) {
    const ok = check.patterns.every((p) => p.test(src));
    const bad = (check.antiPatterns ?? []).some((p) => p.test(src));
    if (!ok || bad) missing.push(check.id);
  }
  return missing;
}

async function main() {
  const playableSrc = await readFile(
    path.join(REPO, "apps/web/lib/playable-games.ts"),
    "utf8"
  );
  const slugs =
    playableSrc.match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];

  const playerSrc = await readFile(
    path.join(REPO, "apps/web/components/game-player.tsx"),
    "utf8"
  );
  const hasErrorMonitor = /GameErrorMonitor/.test(playerSrc);

  const rows = [];
  let allPass = true;

  for (const slug of slugs) {
    let src = "";
    try {
      src = await readGameSources(slug);
    } catch {
      rows.push({ slug, status: "FAIL", missing: ["source"], checks: {} });
      allPass = false;
      continue;
    }

    const missing = runChecks(src, CHECKS);
    const guardMissing = runChecks(src, ERROR_GUARD);
    const pass = missing.length === 0;
    if (!pass) allPass = false;

    const checks = Object.fromEntries(
      CHECKS.map((c) => [c.id, !missing.includes(c.id)])
    );

    rows.push({
      slug,
      status: pass ? "PASS" : "FAIL",
      missing,
      guard: guardMissing.length === 0 ? "PASS" : "WARN",
      checks,
    });
  }

  const passCount = rows.filter((r) => r.status === "PASS").length;

  const md = `# Game Quality Sweep — 50 Games

**Generated:** ${new Date().toISOString()}  
**Scope:** Static SDK verification (start · finish · save · resume · restart · ranking · analytics)  
**Runtime errors:** \`GameErrorMonitor\` in game-player: **${hasErrorMonitor ? "ENABLED" : "MISSING"}** (window.onerror · unhandledrejection → analytics \`error\`)  
**Result:** **${passCount}/50 PASS** · Overall: **${allPass ? "PASS" : "FAIL"}**

---

## Checks

| ID | Description |
|----|-------------|
| start | useReadyCountdown + ReadyCountdown |
| finish | reportScore + GameOverOverlay |
| save | useAutoSave |
| resume | useResumableGame + ResumeDialog |
| restart | emitGameRetry |
| ranking | reportScore (score submit path) |
| analytics | useGameSDK |

---

## Matrix

| # | Slug | Result | Start | Finish | Save | Resume | Restart | Rank | Analytics |
|---|------|:------:|:-----:|:------:|:----:|:------:|:-------:|:----:|:---------:|
${rows
  .map((r, i) => {
    const c = r.checks ?? {};
    const cell = (k) => (c[k] ? "✓" : "—");
    return `| ${i + 1} | ${r.slug} | **${r.status}** | ${cell("start")} | ${cell("finish")} | ${cell("save")} | ${cell("resume")} | ${cell("restart")} | ${cell("ranking")} | ${cell("analytics")} |`;
  })
  .join("\n")}

---

## Failures

${
  rows.filter((r) => r.status === "FAIL").length
    ? rows
        .filter((r) => r.status === "FAIL")
        .map((r) => `- **${r.slug}**: ${r.missing.join(", ")}`)
        .join("\n")
    : "_None — all 50 PASS_"
}

---

Run: \`npm run qa:verify-games\`
`;

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, md, "utf8");
  await writeFile(
    JSON_OUT,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), passCount, total: slugs.length, hasErrorMonitor, games: rows },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Game Quality Sweep: ${passCount}/50 PASS → ${path.relative(REPO, OUT)}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
