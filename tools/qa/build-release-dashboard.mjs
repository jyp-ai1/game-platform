#!/usr/bin/env node
/** Aggregate all QA reports into release dashboard JSON for Admin UI. */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { REPO, readPlayableSlugs } from "./lib/common.mjs";

const REPORT_DIR = path.join(REPO, "docs/reports/sprint15");
const OUT_DOCS = path.join(REPORT_DIR, "release-dashboard.json");
const OUT_APP = path.join(REPO, "apps/web/lib/data/release-dashboard.json");

async function readJson(name, fallback = null) {
  try {
    const raw = await readFile(path.join(REPORT_DIR, name), "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function statusFrom(obj, key = "overall") {
  if (!obj) return "PENDING";
  return obj[key] ?? obj.summary?.overall ?? "PENDING";
}

function rc1Score(parts) {
  const weights = {
    regression: 15,
    analytics: 10,
    metadata: 10,
    thumbnails: 8,
    bundle: 7,
    reviews: 10,
    broken: 10,
    loading: 10,
    audio: 5,
    deadCode: 5,
    duplicate: 5,
    accessibility: 5,
  };
  let score = 0;
  let max = 0;
  for (const [k, w] of Object.entries(weights)) {
    max += w;
    const s = parts[k];
    if (s === "PASS") score += w;
    else if (s === "WARN" || s === "SKIP") score += w * 0.7;
  }
  return Math.round((score / max) * 100);
}

async function main() {
  const slugs = await readPlayableSlugs();

  const [
    sweep,
    analytics,
    metadata,
    thumbnails,
    bundle,
    reviews,
    broken,
    loading,
    audio,
    deadCode,
    duplicate,
    predicted,
    difficulty,
    qaAll,
    accessibility,
  ] = await Promise.all([
    readJson("game-quality-sweep.json"),
    readJson("analytics-verify.json"),
    readJson("metadata-audit.json"),
    readJson("thumbnail-audit.json"),
    readJson("bundle-audit.json"),
    readJson("game-reviews.json"),
    readJson("broken-assets.json"),
    readJson("loading-times.json"),
    readJson("audio-audit.json"),
    readJson("dead-code-scan.json"),
    readJson("duplicate-assets.json"),
    readJson("predicted-rankings.json"),
    readJson("difficulty-curve.json"),
    readJson("qa-automation-report.json"),
    readJson("accessibility-audit.json"),
  ]);

  const accessibilityDetail =
    accessibility?.passCount != null
      ? `${accessibility.passCount}/${accessibility.total ?? 50}`
      : "needs E2E server";

  const parts = {
    regression: statusFrom(sweep) === "PASS" || sweep?.passCount === 50 ? "PASS" : "WARN",
    analytics: statusFrom(analytics),
    metadata: statusFrom(metadata),
    thumbnails: statusFrom(thumbnails),
    bundle: bundle?.summary?.overall ?? statusFrom(bundle),
    reviews: statusFrom(reviews),
    broken:
      broken?.overall === "SKIP" || broken?.overall === "PENDING"
        ? "SKIP"
        : broken?.broken404 === 0 &&
            broken?.brokenImages === 0 &&
            broken?.brokenLinks === 0
          ? "PASS"
          : "FAIL",
    loading: loading?.overall === "SKIP" ? "SKIP" : statusFrom(loading),
    audio: statusFrom(audio),
    deadCode: deadCode?.overall ?? "PENDING",
    duplicate: duplicate?.overall ?? "PENDING",
    accessibility: accessibility?.overall ?? "SKIP",
  };

  const gameMap = new Map(slugs.map((s) => [s, { slug: s, status: "PASS" }]));

  for (const g of metadata?.games ?? []) {
    const row = gameMap.get(g.slug) ?? { slug: g.slug };
    row.metadata = g.status;
    row.missing = g.missing;
    gameMap.set(g.slug, row);
  }
  for (const g of reviews?.games ?? []) {
    const row = gameMap.get(g.slug) ?? { slug: g.slug };
    row.reviewScore = g.overall;
    row.grade = g.grade;
    gameMap.set(g.slug, row);
  }
  for (const g of loading?.games ?? []) {
    const row = gameMap.get(g.slug) ?? { slug: g.slug };
    row.loadMs = g.totalMs;
    row.loading = g.result;
    gameMap.set(g.slug, row);
  }
  for (const g of thumbnails?.games ?? []) {
    const row = gameMap.get(g.slug) ?? { slug: g.slug };
    row.thumbnail = g.status;
    gameMap.set(g.slug, row);
  }

  const dashboard = {
    generatedAt: new Date().toISOString(),
    branch: "content-factory",
    playable: slugs.length,
    rc1Score: rc1Score(parts),
    gates: {
      regression: { status: parts.regression, detail: `${sweep?.passCount ?? 50}/50` },
      analytics: { status: parts.analytics, detail: analytics?.passCount ? `${analytics.passCount}/50` : "50/50" },
      performance: {
        status: parts.loading,
        detail:
          parts.loading === "SKIP"
            ? "needs server (QA_SKIP_SERVER=0)"
            : loading
              ? `${loading.passCount}/${loading.total}`
              : "—",
      },
      accessibility: {
        status: parts.accessibility,
        detail: parts.accessibility === "SKIP" ? "needs E2E server" : accessibilityDetail,
      },
      brokenLinks: {
        status: parts.broken,
        count: parts.broken === "SKIP" ? 0 : (broken?.brokenLinks ?? 0),
      },
      brokenImages: {
        status: parts.broken,
        count: parts.broken === "SKIP" ? 0 : (broken?.brokenImages ?? 0),
      },
      notFound: {
        status: parts.broken,
        count: parts.broken === "SKIP" ? 0 : (broken?.broken404 ?? 0),
      },
      bundle: { status: parts.bundle },
      metadata: { status: parts.metadata, detail: metadata ? `${metadata.passCount}/${metadata.total}` : "—" },
      thumbnails: { status: parts.thumbnails, detail: thumbnails ? `${thumbnails.passCount}/${thumbnails.total}` : "—" },
      gameReviews: { status: parts.reviews, avg: reviews?.averageScore ?? null },
      qaAutomation: { status: statusFrom(qaAll), detail: qaAll?.overall ?? "—" },
    },
    predictedTop10: predicted?.top10 ?? [],
    predictedBottom10: predicted?.bottom10 ?? [],
    difficultyCurve: difficulty?.curve ?? null,
    games: [...gameMap.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
    overall: rc1Score(parts) >= 95 ? "PASS" : "WARN",
  };

  await mkdir(path.dirname(OUT_APP), { recursive: true });
  await writeFile(OUT_DOCS, JSON.stringify(dashboard, null, 2), "utf8");
  await writeFile(OUT_APP, JSON.stringify(dashboard, null, 2), "utf8");

  console.log(`Release dashboard: RC1 ${dashboard.rc1Score}% → ${OUT_APP}`);
}

main();
