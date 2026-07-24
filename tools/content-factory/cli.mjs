#!/usr/bin/env node
/**
 * Content Factory CLI — generate Release Package artifacts from a manifest.
 * Branch: content-factory only. Do not merge to main without PM approval.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runBatch } from "./lib/batch.mjs";
import { runGeneratePipeline } from "./lib/pipeline.mjs";
import { scaffoldFiles } from "./lib/scaffold.mjs";
import { generateThumbnail } from "./lib/thumbnail.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..");

function parseArgs(argv) {
  const args = {
    command: "generate",
    manifest: null,
    out: null,
    withThumbnails: false,
    scaffoldMissing: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "generate" || a === "scaffold" || a === "batch") args.command = a;
    else if (a === "--manifest" || a === "-m") args.manifest = argv[++i];
    else if (a === "--out" || a === "-o") args.out = argv[++i];
    else if (a === "--with-thumbnails") args.withThumbnails = true;
    else if (a === "--scaffold-missing") args.scaffoldMissing = true;
    else if (!a.startsWith("-") && !args.manifest) args.manifest = a;
  }
  return args;
}

async function loadJson(manifestPath) {
  const abs = path.isAbsolute(manifestPath)
    ? manifestPath
    : path.join(REPO_ROOT, manifestPath);
  return JSON.parse(await readFile(abs, "utf8"));
}

async function writeBundle(outDir, bundle, withThumbnails = false) {
  await mkdir(outDir, { recursive: true });
  await mkdir(path.join(outDir, "sql"), { recursive: true });
  await mkdir(path.join(outDir, "wiring"), { recursive: true });

  const writes = [
    ["manifest.resolved.json", JSON.stringify(bundle.manifest, null, 2)],
    ["seo.json", JSON.stringify(bundle.seo, null, 2)],
    ["missions.json", JSON.stringify(bundle.missions, null, 2)],
    ["release-package.json", JSON.stringify(bundle.releasePackage, null, 2)],
    ["sql/migration.sql", bundle.sql.migration],
    ["sql/cms.sql", bundle.sql.cms],
    ["operation-guide.md", bundle.docs.operationGuide],
    ["review-card.md", bundle.docs.reviewCard],
    ["wiring/README.md", bundle.wiring.readme],
    ["wiring/playable-games.snippet.txt", bundle.wiring.playableGamesSnippet + "\n"],
    ["wiring/game-player.snippet.txt", bundle.wiring.gamePlayerSnippet + "\n"],
  ];

  for (const [rel, content] of writes) {
    const dest = path.join(outDir, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, content, "utf8");
  }

  if (withThumbnails) {
    const thumbDir = path.join(outDir, "thumbnails");
    await mkdir(thumbDir, { recursive: true });
    const thumbPath = path.join(thumbDir, `${bundle.manifest.slug}.png`);
    await generateThumbnail(bundle.manifest, thumbPath);
    console.log(`  Thumbnail: ${path.relative(REPO_ROOT, thumbPath)}`);
  }
}

async function cmdGenerate(manifestPath, outOverride, withThumbnails) {
  const raw = await loadJson(manifestPath);
  const bundle = await runGeneratePipeline(raw, { repoRoot: REPO_ROOT });
  const outDir =
    outOverride ?? path.join(__dirname, "output", bundle.manifest.slug);

  await writeBundle(outDir, bundle, withThumbnails);

  const { passCount, pendingCount, checklist } = bundle.releasePackage;
  const total = checklist.length;
  console.log(`\n✓ Content Factory: ${bundle.manifest.slug}`);
  console.log(`  Output: ${path.relative(REPO_ROOT, outDir)}`);
  console.log(`  Release Package: ${passCount}/${total} PASS · ${pendingCount} pending`);
  console.log(`  Code exists: ${checklist.find((c) => c.id === 1)?.status === "PASS" ? "yes" : "no"}`);
}

async function cmdScaffold(manifestPath, outOverride, withThumbnails) {
  const raw = await loadJson(manifestPath);
  const bundle = await runGeneratePipeline(raw, { repoRoot: REPO_ROOT });
  const slug = bundle.manifest.slug;
  const gameDir = outOverride ?? path.join(__dirname, "output", slug, "game-scaffold");
  const files = scaffoldFiles(bundle.manifest);

  for (const [rel, content] of Object.entries(files)) {
    const dest = path.join(gameDir, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, content, "utf8");
  }

  const pkgOut = path.join(__dirname, "output", slug);
  await writeBundle(pkgOut, bundle, withThumbnails);

  console.log(`\n✓ Scaffold + Release Package: ${slug}`);
  console.log(`  Game scaffold: ${path.relative(REPO_ROOT, gameDir)}`);
  console.log(`  Release bundle: ${path.relative(REPO_ROOT, pkgOut)}`);
}

async function cmdBatch(manifestPath, opts) {
  const batch = await loadJson(manifestPath);
  if (!Array.isArray(batch.games)) {
    throw new Error("Batch manifest must have a games array");
  }
  const outRoot =
    opts.out ?? path.join(__dirname, "output", path.basename(manifestPath, ".json"));

  const summary = await runBatch(batch, {
    repoRoot: REPO_ROOT,
    outRoot,
    withThumbnails: opts.withThumbnails,
    scaffoldMissing: opts.scaffoldMissing,
  });

  console.log(`\n✓ Batch: ${summary.label}`);
  console.log(`  Output: ${path.relative(REPO_ROOT, outRoot)}`);
  console.log(`  Games: ${summary.total} · existing ${summary.existing} · scaffolded ${summary.scaffolded}`);
  console.log(`  Avg Release Package PASS: ~${summary.avgPass}/19`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.manifest) {
    console.error(`Usage:
  node tools/content-factory/cli.mjs generate --manifest tools/content-factory/manifests/stack-tower.json [--with-thumbnails]
  node tools/content-factory/cli.mjs scaffold --manifest tools/content-factory/manifests/chess-prototype.json
  node tools/content-factory/cli.mjs batch --manifest tools/content-factory/manifests/sprint-14-batch.json --scaffold-missing --with-thumbnails`);
    process.exit(1);
  }

  if (args.command === "batch") {
    await cmdBatch(args.manifest, args);
  } else if (args.command === "scaffold") {
    await cmdScaffold(args.manifest, args.out, args.withThumbnails);
  } else {
    await cmdGenerate(args.manifest, args.out, args.withThumbnails);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
