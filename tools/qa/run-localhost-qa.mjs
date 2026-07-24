#!/usr/bin/env node
/** Localhost QA runner — Sessions 4–7 staging (OB-001 waived per PM). */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..", "..");
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3010";
const OUT = path.join(REPO, "docs/reports/sprint15/localhost-qa-results.json");

const ROUTES = [
  "/",
  "/games",
  "/profile",
  "/favorites",
  "/search",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/categories/puzzle",
  "/categories/arcade",
  "/admin",
  "/sitemap.xml",
  "/robots.txt",
];

async function fetchOk(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { redirect: "follow", signal: controller.signal });
    const text = await res.text();
    clearTimeout(timer);
    return { status: res.status, ok: res.status === 200, text: text.slice(0, 5000) };
  } catch (e) {
    clearTimeout(timer);
    return { status: 0, ok: false, error: String(e) };
  }
}

async function fetchBatch(urls) {
  return Promise.all(urls.map((url) => fetchOk(url)));
}

async function main() {
  const playable = (
    await readFile(path.join(REPO, "apps/web/lib/playable-games.ts"), "utf8")
  ).match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];

  const routes = {};
  for (const r of ROUTES) {
    const res = await fetchOk(`${BASE}${r}`);
    routes[r] = { pass: res.ok, status: res.status };
  }

  const games = {};
  let gamePass = 0;
  const BATCH = 8;
  for (let i = 0; i < playable.length; i += BATCH) {
    const batch = playable.slice(i, i + BATCH);
    const results = await fetchBatch(batch.map((slug) => `${BASE}/games/${slug}`));
    batch.forEach((slug, idx) => {
      const res = results[idx];
      const hasHowTo = res.text?.includes("플레이") || res.text?.includes("how");
      const pass = res.ok && (res.text?.includes("Re:Play") ?? false);
      if (pass) gamePass++;
      games[slug] = {
        pass,
        status: res.status,
        hasContent: Boolean(res.text && res.text.length > 500),
        hasHowToHint: hasHowTo,
      };
    });
  }

  const home = await fetchOk(`${BASE}/`);
  const seo = {
    canonical: home.text?.includes('rel="canonical"') ?? false,
    og: home.text?.includes('property="og:title"') ?? false,
    jsonLd: home.text?.includes("application/ld+json") ?? false,
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    ob001Waived: true,
    routes: { pass: Object.values(routes).filter((r) => r.pass).length, total: ROUTES.length, detail: routes },
    games: { pass: gamePass, total: playable.length, detail: games },
    seo,
    overall: routes && gamePass === playable.length ? "PASS" : "PARTIAL",
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(summary, null, 2), "utf8");
  console.log(`QA ${summary.overall}: routes ${summary.routes.pass}/${summary.routes.total}, games ${gamePass}/${playable.length}`);
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
