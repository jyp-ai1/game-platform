import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeManifest } from "./manifest.mjs";
import { runGeneratePipeline, buildReleaseBundle } from "./pipeline.mjs";
import { scaffoldFiles } from "./scaffold.mjs";
import { generateThumbnail, thumbnailRegistrySnippet } from "./thumbnail.mjs";

/**
 * @param {string} repoRoot
 * @param {string} slug
 */
async function gameCodeExists(repoRoot, slug) {
  try {
    await access(path.join(repoRoot, "games", slug, "package.json"));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {object} batch
 * @param {{ repoRoot: string; outRoot: string; withThumbnails?: boolean; scaffoldMissing?: boolean }} opts
 */
export async function runBatch(batch, opts) {
  const base = batch.sortOrderBase ?? 36;
  const results = [];
  const migrationParts = [`-- Content Factory batch: ${batch.label ?? "batch"}\n`];
  const cmsParts = [`-- Content Factory CMS batch\n`];
  const playableSnippets = [];
  const playerSnippets = [];
  const thumbSnippets = [];

  let sortOrder = base;
  for (const raw of batch.games) {
    const withOrder = { ...raw, sortOrder: raw.sortOrder ?? sortOrder++ };
    const manifest = normalizeManifest(withOrder);
    const codeExists = await gameCodeExists(opts.repoRoot, manifest.slug);
    const bundle = buildReleaseBundle(manifest, { repoRoot: opts.repoRoot, codeExists });

    const slugOut = path.join(opts.outRoot, manifest.slug);
    await mkdir(path.join(slugOut, "sql"), { recursive: true });
    await mkdir(path.join(slugOut, "wiring"), { recursive: true });

    await writeFile(path.join(slugOut, "release-package.json"), JSON.stringify(bundle.releasePackage, null, 2));
    await writeFile(path.join(slugOut, "seo.json"), JSON.stringify(bundle.seo, null, 2));
    await writeFile(path.join(slugOut, "sql/migration.sql"), bundle.sql.migration);
    await writeFile(path.join(slugOut, "sql/cms.sql"), bundle.sql.cms);

    migrationParts.push(`\n-- ${manifest.slug}\n`, bundle.sql.migration);
    cmsParts.push(`\n-- ${manifest.slug}\n`, bundle.sql.cms);

    playableSnippets.push(bundle.wiring.playableGamesSnippet);
    playerSnippets.push(bundle.wiring.gamePlayerSnippet);
    thumbSnippets.push(thumbnailRegistrySnippet(manifest));

    let thumbnailPath = null;
    if (opts.withThumbnails) {
      const thumbDir = path.join(slugOut, "thumbnails");
      await mkdir(thumbDir, { recursive: true });
      thumbnailPath = path.join(thumbDir, `${manifest.slug}.png`);
      await generateThumbnail(manifest, thumbnailPath);
    }

    let scaffolded = false;
    const skipScaffold = Boolean(raw.skipScaffold) || codeExists;
    if (opts.scaffoldMissing && !skipScaffold) {
      const gameDir = path.join(slugOut, "game-scaffold");
      const files = scaffoldFiles(manifest);
      for (const [rel, content] of Object.entries(files)) {
        const dest = path.join(gameDir, rel);
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, content, "utf8");
      }
      scaffolded = true;
    }

    results.push({
      slug: manifest.slug,
      title: manifest.title,
      category: manifest.category,
      codeExists,
      scaffolded,
      passCount: bundle.releasePackage.passCount,
      pendingCount: bundle.releasePackage.pendingCount,
      thumbnail: thumbnailPath ? path.relative(opts.repoRoot, thumbnailPath) : null,
    });
  }

  await mkdir(path.join(opts.outRoot, "sql"), { recursive: true });
  await mkdir(path.join(opts.outRoot, "wiring"), { recursive: true });
  await writeFile(path.join(opts.outRoot, "sql/migration-batch.sql"), migrationParts.join("\n"));
  await writeFile(path.join(opts.outRoot, "sql/cms-batch.sql"), cmsParts.join("\n"));
  await writeFile(
    path.join(opts.outRoot, "wiring/playable-games.snippet.txt"),
    playableSnippets.join("\n") + "\n"
  );
  await writeFile(
    path.join(opts.outRoot, "wiring/game-player.snippet.txt"),
    playerSnippets.join("\n") + "\n"
  );
  await writeFile(
    path.join(opts.outRoot, "wiring/thumbnails-registry.snippet.txt"),
    thumbSnippets.join("\n") + "\n"
  );

  const summary = {
    label: batch.label,
    generatedAt: new Date().toISOString(),
    total: results.length,
    existing: results.filter((r) => r.codeExists).length,
    scaffolded: results.filter((r) => r.scaffolded).length,
    avgPass: Math.round(
      results.reduce((a, r) => a + r.passCount, 0) / Math.max(results.length, 1)
    ),
    games: results,
  };

  await writeFile(path.join(opts.outRoot, "batch-summary.json"), JSON.stringify(summary, null, 2));
  return summary;
}
