#!/usr/bin/env node
/** Code-based Top10 / Bottom10 engagement prediction (no live analytics). */
import {
  readPlayableSlugs,
  readGameMetadata,
  readGameSource,
  thumbExists,
  writeReport,
  slugToTitle,
} from "./lib/common.mjs";

function scoreGame(slug, meta, src, hasThumb) {
  let score = 50;
  const diff = meta?.difficulty ?? "MEDIUM";
  if (diff === "EASY") score += 12;
  if (diff === "MEDIUM") score += 8;
  if (meta?.category === "arcade") score += 10;
  if (meta?.category === "casual") score += 8;
  if (meta?.tags?.includes("classic")) score += 6;
  if (meta?.tags?.includes("quick-play")) score += 5;
  if (hasThumb) score += 8;
  if (meta?.howToPlay) score += 4;
  if (meta?.description) score += 3;
  if (/useReadyCountdown/.test(src)) score += 3;
  if (/GameOverOverlay/.test(src)) score += 3;
  if (/emitGameRetry/.test(src)) score += 2;
  if (slug === "2048" || slug === "snake" || slug === "tetris") score += 15;
  if (slug === "chess" || slug === "crossword" || slug === "sudoku") score -= 5;
  if (!meta?.difficulty) score -= 10;
  return Math.max(0, Math.min(100, score));
}

async function main() {
  const slugs = await readPlayableSlugs();
  const { bySlug } = await readGameMetadata();
  const ranked = [];

  for (const slug of slugs) {
    const meta = bySlug.get(slug);
    const src = await readGameSource(slug);
    const thumb = await thumbExists(slug);
    ranked.push({
      slug,
      title: meta?.title ?? slugToTitle(slug),
      category: meta?.category ?? "unknown",
      difficulty: meta?.difficulty ?? "UNKNOWN",
      predictedScore: scoreGame(slug, meta, src, thumb.pass),
      hasThumbnail: thumb.pass,
    });
  }

  ranked.sort((a, b) => b.predictedScore - a.predictedScore);
  const top10 = ranked.slice(0, 10);
  const bottom10 = [...ranked].reverse().slice(0, 10);

  const summary = {
    generatedAt: new Date().toISOString(),
    method: "code-heuristic (difficulty, category, SDK, thumbnail, classics)",
    note: "Replace with live analytics Top/Bottom after Operator applies migrations",
    top10,
    bottom10,
    overall: "PASS",
  };

  const out = await writeReport("predicted-rankings.json", summary);
  console.log(`Predicted rankings: Top ${top10[0]?.slug} · Bottom ${bottom10[0]?.slug} → ${out}`);
}

main();
