/**
 * Fetch admin feedback summary evidence (Preview QA).
 * Usage: node tools/qa/fetch-admin-feedback-summary.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "docs/qa/cpo/game-feedback-ops/admin-summary.json");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

function loadEnv() {
  loadEnvFile(join(ROOT, "apps/web/.env.qa.tmp"));
  loadEnvFile(join(ROOT, "apps/web/.env.local"));
}

loadEnv();

const base =
  process.env.QA_BASE_URL ?? "https://game29-b0qf98px8-jyp-ai1s-projects.vercel.app";
const secret = process.env.ADMIN_SECRET;

if (!secret) {
  console.error("ADMIN_SECRET missing — pull Vercel preview env first");
  process.exit(2);
}

const authRes = await fetch(`${base}/api/admin/auth`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: secret }),
});

if (!authRes.ok) {
  console.error("Admin auth failed:", authRes.status);
  process.exit(3);
}

const setCookie = authRes.headers.getSetCookie?.() ?? [];
const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
const today = new Date().toISOString().slice(0, 10);

const headers = cookie ? { Cookie: cookie } : {};

const sumRes = await fetch(`${base}/api/admin/feedback/summary?date=${today}`, { headers });
const datesRes = await fetch(`${base}/api/admin/feedback/summary?listDates=1`, { headers });

const summary = await sumRes.json();
const dates = await datesRes.json();

const out = {
  migration0036: "APPLIED",
  preview: base,
  commit: process.env.QA_COMMIT ?? "6068881",
  date: today,
  summary,
  dates,
  checks: {
    byGame: Boolean(summary.ok && summary.summary?.byGame),
    byType: Boolean(summary.ok && summary.summary?.byType),
    games: Array.isArray(summary.summary?.games),
    listDates: Boolean(dates.ok && Array.isArray(dates.dates)),
    territoryWarExcluded: !Object.keys(summary.summary?.byGame ?? {}).includes("territory-war"),
  },
  finishedAt: new Date().toISOString(),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2));

console.log(
  `admin-summary.json ok=${summary.ok} total=${summary.summary?.total ?? "?"} byGame=${Object.keys(summary.summary?.byGame ?? {}).length}`
);

if (existsSync(join(ROOT, "apps/web/.env.qa.tmp"))) {
  unlinkSync(join(ROOT, "apps/web/.env.qa.tmp"));
}

process.exit(summary.ok ? 0 : 1);
