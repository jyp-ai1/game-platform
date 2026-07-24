#!/usr/bin/env node
/** 404 scanner — all game, admin, static routes. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3010";
const OUT = path.join(REPO, "docs/reports/sprint15/404-scan.json");

const ADMIN = [
  "/admin",
  "/admin/analytics",
  "/admin/games",
  "/admin/cms",
  "/admin/cms/categories",
  "/admin/cms/banners",
  "/admin/cms/events",
  "/admin/cms/featured",
  "/admin/cms/notices",
  "/admin/cms/visibility",
  "/admin/cms/audit",
  "/admin/monitoring",
  "/admin/soft-launch",
  "/admin/seo",
  "/admin/settings",
  "/admin/flags",
  "/admin/reports",
];

const STATIC = [
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
  "/sitemap.xml",
  "/robots.txt",
];

async function check(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    return { url, status: res.status, pass: res.status !== 404 && res.status < 500 };
  } catch (e) {
    return { url, status: 0, pass: false, error: String(e) };
  }
}

async function main() {
  const playableSrc = await readFile(
    path.join(REPO, "apps/web/lib/playable-games.ts"),
    "utf8"
  );
  const slugs =
    playableSrc.match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];

  const urls = [
    ...STATIC.map((p) => `${BASE}${p}`),
    ...ADMIN.map((p) => `${BASE}${p}`),
    ...slugs.map((s) => `${BASE}/games/${s}`),
  ];

  const results = [];
  const BATCH = 10;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = await Promise.all(urls.slice(i, i + BATCH).map(check));
    results.push(...batch);
  }

  const failures = results.filter((r) => !r.pass);
  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    total: results.length,
    pass: results.filter((r) => r.pass).length,
    failures404: failures.filter((f) => f.status === 404).length,
    failures: failures.map((f) => ({ url: f.url, status: f.status, error: f.error })),
    overall: failures.length === 0 ? "PASS" : "FAIL",
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(summary, null, 2), "utf8");
  console.log(
    `404 scan: ${summary.pass}/${summary.total} PASS · 404 count: ${summary.failures404}`
  );
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

main();
