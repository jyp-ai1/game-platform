/**
 * Build byGame/byType evidence from public comment APIs (no admin cookie).
 * QA_BASE_URL=<preview> node tools/qa/aggregate-public-feedback-evidence.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "docs/qa/cpo/game-feedback-ops/public-aggregation-evidence.json");
const BASE = process.env.QA_BASE_URL ?? "https://game29-b0qf98px8-jyp-ai1s-projects.vercel.app";
const P0 = ["agar", "snake", "bomber", "re-front"];
const TYPES = ["opinion", "bug", "idea", "fun", "mobile"];

const byGame = {};
const byType = Object.fromEntries(TYPES.map((t) => [t, 0]));
const games = [];
let total = 0;
const today = new Date().toISOString().slice(0, 10);
const todayRows = [];

for (const slug of P0) {
  const res = await fetch(`${BASE}/api/games/${slug}/comments`);
  const json = await res.json();
  const comments = json.comments ?? [];
  const typeCounts = Object.fromEntries(TYPES.map((t) => [t, 0]));

  for (const c of comments) {
    total += 1;
    byGame[slug] = (byGame[slug] ?? 0) + 1;
    const ft = TYPES.includes(c.feedbackType) ? c.feedbackType : "opinion";
    byType[ft] += 1;
    typeCounts[ft] += 1;
    if (String(c.createdAt).startsWith(today)) todayRows.push(c);
  }

  games.push({
    gameSlug: slug,
    total: comments.length,
    byType: typeCounts,
  });
}

const todayByGame = {};
const todayByType = Object.fromEntries(TYPES.map((t) => [t, 0]));
for (const row of todayRows) {
  todayByGame[row.gameSlug] = (todayByGame[row.gameSlug] ?? 0) + 1;
  const ft = TYPES.includes(row.feedbackType) ? row.feedbackType : "opinion";
  todayByType[ft] += 1;
}

const evidence = {
  source: "public GET /api/games/[slug]/comments",
  preview: BASE,
  migration0036: "APPLIED",
  total,
  byGame,
  byType,
  games,
  daily: {
    date: today,
    total: todayRows.length,
    byGame: todayByGame,
    byType: todayByType,
  },
  territoryWarExcluded: !P0.includes("territory-war") && !byGame["territory-war"],
  finishedAt: new Date().toISOString(),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(evidence, null, 2));
console.log(`public-aggregation-evidence.json total=${total} today=${todayRows.length}`);
process.exit(0);
