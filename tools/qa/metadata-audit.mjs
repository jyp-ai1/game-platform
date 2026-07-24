#!/usr/bin/env node
/** Metadata completeness — difficulty, time, tags, category, thumbnail. */
import {
  readPlayableSlugs,
  readGameMetadata,
  thumbExists,
  writeReport,
  slugToTitle,
} from "./lib/common.mjs";

const PLAY_TIME = { EASY: "2–5 min", MEDIUM: "5–15 min", HARD: "15–30 min" };

async function main() {
  const slugs = await readPlayableSlugs();
  const { bySlug } = await readGameMetadata();
  const rows = [];
  let passCount = 0;

  for (const slug of slugs) {
    const meta = bySlug.get(slug);
    const thumb = await thumbExists(slug);
    const diff = meta?.difficulty ?? "MEDIUM";
    const playTime = PLAY_TIME[diff] ?? null;

    const missing = [];
    if (!meta?.difficulty) missing.push("difficulty");
    if (!playTime) missing.push("playTime");
    if (!meta?.tags?.length) missing.push("tags");
    if (!meta?.category) missing.push("category");
    if (!thumb.pass) missing.push("thumbnail");
    if (!meta?.howToPlay) missing.push("howToPlay");
    if (!meta?.description) missing.push("description");

    const pass = missing.length === 0;
    if (pass) passCount++;

    rows.push({
      slug,
      title: meta?.title ?? slugToTitle(slug),
      difficulty: meta?.difficulty ?? null,
      playTime,
      category: meta?.category ?? null,
      tagCount: meta?.tags?.length ?? 0,
      hasThumbnail: thumb.pass,
      missing,
      status: pass ? "PASS" : "FAIL",
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    passCount,
    total: slugs.length,
    games: rows,
    overall: passCount === slugs.length ? "PASS" : "FAIL",
  };

  const out = await writeReport("metadata-audit.json", summary);
  console.log(`Metadata audit: ${passCount}/${slugs.length} PASS → ${out}`);
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
