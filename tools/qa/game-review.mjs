#!/usr/bin/env node
/** Automated game review — fun, controls, addiction, polish, UX, replay (heuristic). */
import {
  readPlayableSlugs,
  readGameMetadata,
  readGameSource,
  writeReport,
  slugToTitle,
} from "./lib/common.mjs";

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function reviewGame(slug, meta, src) {
  const hasKeyboard = /Arrow|keyboard|keydown|key ===|onKeyDown/i.test(src);
  const hasPointer = /pointer|onClick|touch/i.test(src);
  const controls = clamp(
    40 + (hasKeyboard ? 25 : 0) + (hasPointer ? 25 : 0) + (/useReadyCountdown/.test(src) ? 10 : 0)
  );

  const addiction = clamp(
    35 +
      (/reportScore/.test(src) ? 20 : 0) +
      (/useAutoSave/.test(src) ? 15 : 0) +
      (/emitGameRetry/.test(src) ? 15 : 0) +
      (meta?.category === "arcade" ? 10 : 0)
  );

  const polish = clamp(
    40 +
      (/GameOverOverlay/.test(src) ? 20 : 0) +
      (/SaveIndicator/.test(src) ? 15 : 0) +
      (/ResumeDialog/.test(src) ? 15 : 0) +
      (meta?.howToPlay ? 10 : 0)
  );

  const ux = clamp(
    35 +
      (/useResumableGame/.test(src) ? 20 : 0) +
      (/useAutoSave/.test(src) ? 15 : 0) +
      (/ReadyCountdown/.test(src) ? 15 : 0) +
      (meta?.description ? 10 : 0)
  );

  const replay = clamp(
    30 +
      (/emitGameRetry/.test(src) ? 25 : 0) +
      (/useAutoSave/.test(src) ? 20 : 0) +
      (/reportScore/.test(src) ? 15 : 0) +
      (meta?.difficulty === "EASY" ? 10 : 5)
  );

  const fun = clamp(
    40 +
      (meta?.category === "arcade" ? 15 : 0) +
      (meta?.category === "casual" ? 12 : 0) +
      (meta?.tags?.includes("classic") ? 10 : 0) +
      addiction * 0.15 +
      controls * 0.1
  );

  const overall = clamp((fun + controls + addiction + polish + ux + replay) / 6);

  return {
    slug,
    title: meta?.title ?? slugToTitle(slug),
    scores: { fun, controls, addiction, polish, ux, replay },
    overall,
    grade: overall >= 85 ? "A" : overall >= 70 ? "B" : overall >= 55 ? "C" : "D",
  };
}

async function main() {
  const slugs = await readPlayableSlugs();
  const { bySlug } = await readGameMetadata();
  const reviews = [];

  for (const slug of slugs) {
    const meta = bySlug.get(slug);
    const src = await readGameSource(slug);
    reviews.push(reviewGame(slug, meta, src));
  }

  reviews.sort((a, b) => b.overall - a.overall);
  const avg = Math.round(reviews.reduce((s, r) => s + r.overall, 0) / reviews.length);

  const summary = {
    generatedAt: new Date().toISOString(),
    method: "static heuristic (SDK + source patterns + metadata)",
    averageScore: avg,
    top5: reviews.slice(0, 5),
    bottom5: reviews.slice(-5),
    games: reviews,
    overall: avg >= 70 ? "PASS" : "WARN",
  };

  const out = await writeReport("game-reviews.json", summary);
  console.log(`Game reviews: avg ${avg}/100 · ${reviews.length} games → ${out}`);
}

main();
