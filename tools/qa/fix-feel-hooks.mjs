#!/usr/bin/env node
/** Fix feel hook placement and state mapping across all games. */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const HOOK_BLOCK = `  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
  });`;

async function fixFile(file) {
  let src = await readFile(file, "utf8");
  if (!src.includes("useStandardGameFeel")) return false;

  if (!src.includes("standardFeelFromState")) {
    src = src.replace(
      "useStandardGameFeel,",
      "standardFeelFromState,\n  useStandardGameFeel,"
    );
  }

  src = src.replace(
    /\n  const feel = useStandardGameFeel\(GAME_SLUG, \{[\s\S]*?\n  \}\);/,
    `\n${HOOK_BLOCK}`
  );

  await writeFile(file, src, "utf8");
  return true;
}

async function main() {
  const dirs = await readdir(path.join(REPO, "games"));
  let n = 0;
  for (const slug of dirs) {
    const srcDir = path.join(REPO, "games", slug, "src");
    try {
      const files = await readdir(srcDir);
      for (const f of files.filter((x) => x.endsWith(".tsx"))) {
        if (await fixFile(path.join(srcDir, f))) n++;
      }
    } catch {
      /* skip */
    }
  }
  console.log(`Fixed ${n} files`);
}

main();
