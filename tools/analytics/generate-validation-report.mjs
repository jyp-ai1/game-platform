#!/usr/bin/env node
/**
 * Analytics code validation — scans 50 playable games for SDK hooks.
 * Generates PASS/FAIL report (code-side; DB validation is Operator).
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..", "..");
const OUT = path.join(REPO, "docs/reports/sprint15/analytics-matrix.md");

const CHECKS = [
  { id: "reportScore", pattern: /reportScore\s*\(/, label: "game_end / score" },
  { id: "useAutoSave", pattern: /useAutoSave\s*\(/, label: "auto-save" },
  { id: "useResumableGame", pattern: /useResumableGame\s*\(/, label: "resume" },
  { id: "useReadyCountdown", pattern: /useReadyCountdown\s*\(/, label: "ready countdown" },
  { id: "GameOverOverlay", pattern: /GameOverOverlay/, label: "finish overlay" },
  { id: "emitGameRetry", pattern: /emitGameRetry\s*\(/, label: "retry analytics" },
];

async function main() {
  const playableSrc = await readFile(
    path.join(REPO, "apps/web/lib/playable-games.ts"),
    "utf8"
  );
  const slugs =
    playableSrc.match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];

  const rows = [];
  let allPass = true;

  for (const slug of slugs) {
    const srcDir = path.join(REPO, "games", slug, "src");
    let src = "";
    try {
      const files = (await readdir(srcDir)).filter((f) => /\.tsx?$/.test(f));
      src = (
        await Promise.all(files.map((f) => readFile(path.join(srcDir, f), "utf8")))
      ).join("\n");
    } catch {
      rows.push({ slug, status: "FAIL", missing: ["file"] });
      allPass = false;
      continue;
    }

    const missing = [];
    for (const check of CHECKS) {
      if (!check.pattern.test(src)) missing.push(check.id);
    }
    const status = missing.length === 0 ? "PASS" : "FAIL";
    if (status === "FAIL") allPass = false;
    rows.push({ slug, status, missing });
  }

  const passCount = rows.filter((r) => r.status === "PASS").length;
  const md = `# Analytics Validation Matrix — 50 Games (Code)

**Generated:** ${new Date().toISOString().slice(0, 10)}  
**Scope:** Static code scan · DB SQL validation = Operator  
**Result:** **${passCount}/50 PASS** · Overall: **${allPass ? "PASS" : "FAIL"}**

---

## Checks per game

| Check | Description |
|-------|-------------|
| reportScore | game_end on finish |
| useAutoSave | mid-game save |
| useResumableGame | resume dialog |
| useReadyCountdown | 3-2-1-GO |
| GameOverOverlay | unified finish UX |
| emitGameRetry | retry → analytics |

---

## Matrix

| # | Slug | Status | Missing |
|---|------|:------:|---------|
${rows.map((r, i) => `| ${i + 1} | ${r.slug} | **${r.status}** | ${r.missing.length ? r.missing.join(", ") : "—"} |`).join("\n")}

---

## Operator SQL (live DB)

\`\`\`sql
select game_slug, event_type, count(*) as cnt
from public.analytics_events
where created_at > now() - interval '7 days'
  and game_slug is not null
group by game_slug, event_type
order by game_slug, event_type;
\`\`\`

See also [\`analytics-validation.md\`](./analytics-validation.md).
`;

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, md, "utf8");
  console.log(`Wrote ${path.relative(REPO, OUT)} — ${passCount}/50 PASS`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
