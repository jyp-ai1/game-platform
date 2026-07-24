#!/usr/bin/env node
/** Bundle / size audit for game packages. */
import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(REPO, "docs/reports/sprint15/bundle-audit.json");

async function dirSize(dir) {
  let total = 0;
  let files = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.name === "node_modules" || e.name === "dist") continue;
      if (e.isDirectory()) {
        const sub = await dirSize(p);
        total += sub.bytes;
        files += sub.files;
      } else {
        const s = await stat(p);
        total += s.size;
        files += 1;
      }
    }
  } catch {
    /* missing dir */
  }
  return { bytes: total, files };
}

async function main() {
  const playableSrc = await readFile(
    path.join(REPO, "apps/web/lib/playable-games.ts"),
    "utf8"
  );
  const slugs =
    playableSrc.match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];

  const games = [];
  for (const slug of slugs) {
    const gameDir = path.join(REPO, "games", slug);
    const srcDir = path.join(gameDir, "src");
    const size = await dirSize(srcDir);
    games.push({
      slug,
      srcBytes: size.bytes,
      srcFiles: size.files,
      kb: Math.round(size.bytes / 1024),
    });
  }

  games.sort((a, b) => b.srcBytes - a.srcBytes);
  const totalBytes = games.reduce((s, g) => s + g.srcBytes, 0);
  const oversized = games.filter((g) => g.kb > 80);

  const summary = {
    generatedAt: new Date().toISOString(),
    gameCount: games.length,
    totalSrcKb: Math.round(totalBytes / 1024),
    avgKb: Math.round(totalBytes / games.length / 1024),
    largest: games.slice(0, 5),
    oversizedThresholdKb: 80,
    oversized,
    overall: oversized.length <= 5 ? "PASS" : "WARN",
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ summary, games }, null, 2), "utf8");
  console.log(
    `Bundle audit: ${summary.gameCount} games · ${summary.totalSrcKb} KB total · ${summary.overall}`
  );
  process.exit(0);
}

main();
