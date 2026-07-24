#!/usr/bin/env node
/** Duplicate asset scan — same hash across games/. */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GAMES = path.join(REPO, "games");
const OUT = path.join(REPO, "docs/reports/sprint15/duplicate-assets.json");

const ASSET_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".mp3", ".wav", ".ogg"]);

async function walkAssets(dir, slug, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      await walkAssets(p, slug, acc);
    } else if (ASSET_EXT.has(path.extname(e.name).toLowerCase())) {
      acc.push({ path: p, slug, name: e.name });
    }
  }
  return acc;
}

async function main() {
  const gameDirs = (await readdir(GAMES, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const byHash = new Map();
  let assetCount = 0;

  for (const slug of gameDirs) {
    const assets = await walkAssets(path.join(GAMES, slug), slug);
    for (const asset of assets) {
      assetCount++;
      const buf = await readFile(asset.path);
      const hash = createHash("sha256").update(buf).digest("hex").slice(0, 16);
      const list = byHash.get(hash) ?? [];
      list.push({ slug: asset.slug, file: path.relative(GAMES, asset.path) });
      byHash.set(hash, list);
    }
  }

  const duplicates = [...byHash.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([hash, files]) => ({ hash, count: files.length, files }));

  const summary = {
    generatedAt: new Date().toISOString(),
    gamesScanned: gameDirs.length,
    assetCount,
    duplicateGroups: duplicates.length,
    duplicates: duplicates.slice(0, 30),
    overall: duplicates.length <= 10 ? "PASS" : "WARN",
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(summary, null, 2), "utf8");
  console.log(
    `Duplicate assets: ${assetCount} files · ${duplicates.length} duplicate groups · ${summary.overall}`
  );
  process.exit(0);
}

main();
