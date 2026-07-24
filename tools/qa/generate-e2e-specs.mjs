#!/usr/bin/env node
/** Generate one Playwright spec per playable game. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT_DIR = path.join(REPO, "tests/e2e/games");

const SPEC_TEMPLATE = (slug, title) => `import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("${title}", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "${slug}");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "${slug}");
  });
});
`;

function slugToTitle(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function main() {
  const src = await readFile(
    path.join(REPO, "apps/web/lib/playable-games.ts"),
    "utf8"
  );
  const slugs =
    src.match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];

  await mkdir(OUT_DIR, { recursive: true });

  for (const slug of slugs) {
    const filename = `${slug}.spec.ts`;
    await writeFile(
      path.join(OUT_DIR, filename),
      SPEC_TEMPLATE(slug, slugToTitle(slug)),
      "utf8"
    );
  }

  console.log(`Generated ${slugs.length} E2E specs → tests/e2e/games/`);
}

main();
