#!/usr/bin/env node
/** Difficulty curve analysis — Easy / Normal / Hard distribution + balance. */
import { writeReport, readPlayableSlugs, readGameMetadata } from "./lib/common.mjs";

const DIFF_LABEL = { EASY: "Easy", MEDIUM: "Normal", HARD: "Hard" };

async function main() {
  const slugs = await readPlayableSlugs();
  const { bySlug } = await readGameMetadata();

  const counts = { EASY: 0, MEDIUM: 0, HARD: 0, UNKNOWN: 0 };
  const rows = [];

  for (const slug of slugs) {
    const meta = bySlug.get(slug);
    const diff = meta?.difficulty ?? "UNKNOWN";
    if (diff in counts) counts[diff]++;
    else counts.UNKNOWN++;

    rows.push({
      slug,
      title: meta?.title ?? slug,
      difficulty: diff,
      label: DIFF_LABEL[diff] ?? "Unknown",
      category: meta?.category ?? null,
      playTime: meta?.playTimeLabel ?? null,
    });
  }

  const total = slugs.length;
  const curve = {
    easyPct: Math.round((counts.EASY / total) * 100),
    normalPct: Math.round((counts.MEDIUM / total) * 100),
    hardPct: Math.round((counts.HARD / total) * 100),
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    total,
    counts,
    curve,
    targetMix: { easy: "40%", normal: "40%", hard: "20%" },
    rows,
    overall: counts.UNKNOWN === 0 ? "PASS" : "WARN",
  };

  const out = await writeReport("difficulty-curve.json", summary);
  console.log(
    `Difficulty curve: Easy ${counts.EASY} · Normal ${counts.MEDIUM} · Hard ${counts.HARD} → ${out}`
  );
}

main();
