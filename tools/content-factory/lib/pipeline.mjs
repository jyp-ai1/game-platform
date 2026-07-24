import { access } from "node:fs/promises";
import path from "node:path";

import { generateOperationGuide, generateReviewCard } from "./docs.mjs";
import { normalizeManifest } from "./manifest.mjs";
import { generateMissions } from "./missions.mjs";
import { generateReleasePackage, tallyReleasePackage } from "./release-package.mjs";
import { generateSeo } from "./seo.mjs";
import { generateCmsSql, generateMigrationSql } from "./sql.mjs";
import {
  generateGamePlayerSnippet,
  generatePlayableGamesSnippet,
  generateWiringReadme,
} from "./wiring.mjs";

/** @typedef {import('./types.mjs').GameManifest} GameManifest */

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
 * @param {GameManifest} manifest
 * @param {{ repoRoot: string; codeExists?: boolean }} ctx
 */
export function buildReleaseBundle(manifest, ctx) {
  const codeExists = ctx.codeExists ?? false;
  const pkg = tallyReleasePackage(generateReleasePackage(manifest, { codeExists }));

  return {
    manifest,
    seo: generateSeo(manifest),
    missions: generateMissions(manifest),
    releasePackage: pkg,
    sql: {
      migration: generateMigrationSql(manifest),
      cms: generateCmsSql(manifest),
    },
    docs: {
      operationGuide: generateOperationGuide(manifest),
      reviewCard: generateReviewCard(manifest),
    },
    wiring: {
      readme: generateWiringReadme(manifest),
      playableGamesSnippet: generatePlayableGamesSnippet(manifest),
      gamePlayerSnippet: generateGamePlayerSnippet(manifest),
    },
  };
}

/**
 * @param {GameManifest} raw
 * @param {{ repoRoot: string }} ctx
 */
export async function runGeneratePipeline(raw, ctx) {
  const manifest = normalizeManifest(raw);
  const codeExists = await gameCodeExists(ctx.repoRoot, manifest.slug);
  return buildReleaseBundle(manifest, { ...ctx, codeExists });
}
