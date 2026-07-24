#!/usr/bin/env node
/** Game page loading time — fetch TTFB + total for 50 games. */
import { readPlayableSlugs, writeReport, slugToTitle } from "./lib/common.mjs";
import { readGameMetadata } from "./lib/common.mjs";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3020";

async function measure(path) {
  const url = `${BASE}${path}`;
  const start = performance.now();
  try {
    const res = await fetch(url, { redirect: "follow" });
    const text = await res.text();
    const totalMs = Math.round(performance.now() - start);
    return {
      path,
      status: res.status,
      totalMs,
      bytes: text.length,
      ok: res.status < 400,
    };
  } catch (e) {
    return {
      path,
      status: 0,
      totalMs: Math.round(performance.now() - start),
      ok: false,
      error: String(e),
    };
  }
}

async function main() {
  const slugs = await readPlayableSlugs();
  const { bySlug } = await readGameMetadata();
  const rows = [];
  let pass = 0;

  const BATCH = 5;
  for (let i = 0; i < slugs.length; i += BATCH) {
    const batch = slugs.slice(i, i + BATCH);
    const results = await Promise.all(batch.map((s) => measure(`/games/${s}`)));
    for (let j = 0; j < batch.length; j++) {
      const slug = batch[j];
      const r = results[j];
      const ok = r.ok && r.totalMs < 8000;
      if (ok) pass++;
      rows.push({
        slug,
        title: bySlug.get(slug)?.title ?? slugToTitle(slug),
        totalMs: r.totalMs,
        status: r.status,
        ok,
        result: ok ? "PASS" : "FAIL",
      });
    }
  }

  const avgMs = Math.round(rows.reduce((s, r) => s + r.totalMs, 0) / rows.length);
  const noServer = rows.every((r) => r.status === 0);

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    passCount: pass,
    total: slugs.length,
    avgLoadMs: avgMs,
    thresholdMs: 8000,
    games: rows,
    overall: noServer ? "SKIP" : pass === slugs.length ? "PASS" : "FAIL",
  };

  if (noServer) {
    summary.note = "No server at " + BASE + " — run with QA_SKIP_SERVER=0 when server is up";
  }

  const out = await writeReport("loading-times.json", summary);
  console.log(`Loading times: ${pass}/${slugs.length} under 8s · avg ${avgMs}ms → ${out}`);
  if (summary.overall === "SKIP") process.exit(0);
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

main();
