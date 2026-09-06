/**
 * Production Feedback Signal Report — REAL_PLAYER vs QA_AUTOMATION.
 * node tools/qa/export-production-feedback-signal.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "docs/qa/cpo/feedback-intelligence/production-signal");

const P0 = ["agar", "snake", "bomber", "re-front"];
const SELECTION = ["agar", "snake", "bomber"];
const TYPES = ["bug", "mobile", "fun", "idea", "opinion"];

function loadEnv() {
  for (const path of [join(ROOT, "apps/web/.env.qa.tmp"), join(ROOT, "apps/web/.env.local")]) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      let val = trimmed.slice(eq + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[trimmed.slice(0, eq)] = val;
    }
  }
}

function normalizeKey(content) {
  return content.trim().toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s가-힣]/g, "").slice(0, 120);
}

function detectPatterns(rows, min = 2) {
  const groups = new Map();
  for (const row of rows) {
    if (!["bug", "mobile", "fun", "idea"].includes(row.feedback_type)) continue;
    const key = normalizeKey(row.content);
    if (key.length < 4) continue;
    const gk = `${row.game_slug}:${row.feedback_type}:${key}`;
    const g = groups.get(gk) ?? { count: 0, sample: row.content, latest: row.created_at, game: row.game_slug, type: row.feedback_type };
    g.count += 1;
    if (row.created_at > g.latest) g.latest = row.created_at;
    groups.set(gk, g);
  }
  return [...groups.values()].filter((g) => g.count >= min).sort((a, b) => b.count - a.count);
}

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(2);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  let rows = [];
  let hasProv = false;

  const withProv = await admin
    .from("game_comments")
    .select("id, game_slug, author, content, feedback_type, status, feedback_provenance, created_at")
    .in("game_slug", P0)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (!withProv.error) {
    rows = withProv.data ?? [];
    hasProv = true;
  } else {
    const legacy = await admin
      .from("game_comments")
      .select("id, game_slug, author, content, feedback_type, status, created_at")
      .in("game_slug", P0)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (legacy.error) throw new Error(legacy.error.message);
    rows = legacy.data ?? [];
    hasProv = false;
  }

  const classify = (r) => {
    if (hasProv && r.feedback_provenance) return r.feedback_provenance;
    const a = String(r.author).toLowerCase();
    const c = String(r.content).toLowerCase();
    if (a.startsWith("qa-") || c.includes("fbops-") || c.includes("wo-qa-")) return "QA_AUTOMATION";
    return "REAL_PLAYER";
  };

  const classified = rows.map((r) => ({ ...r, provenance: classify(r) }));
  const real = classified.filter((r) => r.provenance === "REAL_PLAYER");
  const qa = classified.filter((r) => r.provenance === "QA_AUTOMATION");
  const realSel = real.filter((r) => SELECTION.includes(r.game_slug));

  const byGame = Object.fromEntries(P0.map((g) => [g, real.filter((r) => r.game_slug === g).length]));
  const byType = Object.fromEntries(TYPES.map((t) => [t, real.filter((r) => r.feedback_type === t).length]));
  const patterns = detectPatterns(realSel);

  const report = {
    generatedAt: new Date().toISOString(),
    source: "Supabase game_comments",
    migration0038Applied: hasProv,
    realPlayerTotal: real.length,
    qaAutomationTotal: qa.length,
    byGameRealPlayer: byGame,
    byTypeRealPlayer: byType,
    repeatPatternsRealPlayer: patterns.slice(0, 10),
    cpoWorkOrderCandidates: patterns.slice(0, 3).map((p, i) => ({
      rank: i + 1,
      game: p.game,
      type: p.type,
      problem: p.sample,
      count: p.count,
      latestAt: p.latest,
    })),
  };

  const md = `# 🎮 Re:Play — Production Feedback Signal Report

Generated: ${report.generatedAt}
Migration 0038 applied: ${hasProv ? "yes" : "no (using heuristic fallback)"}

## Counts

REAL_PLAYER feedback: **${real.length}**
QA/Automation feedback: **${qa.length}**

## Game별 REAL_PLAYER

| Game | Count |
| --- | ---: |
| Agar | ${byGame.agar ?? 0} |
| Snake | ${byGame.snake ?? 0} |
| Bomber | ${byGame.bomber ?? 0} |
| Re:Front | ${byGame["re-front"] ?? 0} |

## Type별 REAL_PLAYER

| Type | Count |
| --- | ---: |
| Bug | ${byType.bug ?? 0} |
| Mobile | ${byType.mobile ?? 0} |
| Fun | ${byType.fun ?? 0} |
| Idea | ${byType.idea ?? 0} |
| Opinion | ${byType.opinion ?? 0} |

## 반복 패턴 (REAL_PLAYER · agar/snake/bomber · min 2)

${patterns.length === 0 ? "_None yet — awaiting real player feedback._" : patterns.slice(0, 5).map((p, i) => `${i + 1}. **${p.game}/${p.type}** ×${p.count} — "${p.sample.slice(0, 80)}"`).join("\n")}

## CPO Work Order 후보

${patterns.length === 0 ? "_대기 — REAL_PLAYER bug/mobile/fun 데이터 유입 후 선정._" : patterns.slice(0, 3).map((p, i) => `${i + 1}. ${p.game} / ${p.type} — ${p.sample.slice(0, 60)} (${p.count}건)`).join("\n")}
`;

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "signal-report.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(OUT, "SIGNAL-REPORT.md"), md);

  console.log(`REAL_PLAYER=${real.length} QA=${qa.length} patterns=${patterns.length}`);
  console.log(`Report: ${OUT}/SIGNAL-REPORT.md`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
