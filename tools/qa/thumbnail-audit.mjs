#!/usr/bin/env node
/** Thumbnail quality audit — presence + file size. */
import { stat } from "node:fs/promises";
import path from "node:path";
import { readPlayableSlugs, thumbExists, writeReport, slugToTitle } from "./lib/common.mjs";
import { readGameMetadata } from "./lib/common.mjs";

async function main() {
  const slugs = await readPlayableSlugs();
  const { bySlug } = await readGameMetadata();
  const rows = [];
  let pass = 0;

  for (const slug of slugs) {
    const thumb = await thumbExists(slug);
    let bytes = 0;
    let quality = "MISSING";
    if (thumb.pass) {
      const s = await stat(thumb.path);
      bytes = s.size;
      if (bytes < 500) quality = "TOO_SMALL";
      else if (bytes > 500_000) quality = "TOO_LARGE";
      else quality = "PASS";
    }
    if (quality === "PASS") pass++;
    rows.push({
      slug,
      title: bySlug.get(slug)?.title ?? slugToTitle(slug),
      path: thumb.pass ? path.relative(process.cwd(), thumb.path) : null,
      bytes,
      quality,
      status: quality === "PASS" ? "PASS" : "FAIL",
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    passCount: pass,
    total: slugs.length,
    games: rows,
    overall: pass === slugs.length ? "PASS" : "FAIL",
  };

  const out = await writeReport("thumbnail-audit.json", summary);
  console.log(`Thumbnail audit: ${pass}/${slugs.length} PASS → ${out}`);
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

main();
