#!/usr/bin/env node
/**
 * Sprint 14 — safe batch apply Standard Game Feel to all playable games.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..", "..");
const SKIP_FILES = new Set(["SnakeIo.tsx"]);

async function findGameFile(slug) {
  const srcDir = path.join(REPO, "games", slug, "src");
  const files = await readdir(srcDir);
  const tsx = files.filter((f) => f.endsWith(".tsx") && !SKIP_FILES.has(f));
  return tsx[0] ? path.join(srcDir, tsx[0]) : null;
}

function patchSdkImport(src) {
  if (src.includes("useStandardGameFeel")) return src;
  const re = /import \{([\s\S]*?)\} from "@game-platform\/game-sdk";/;
  const m = src.match(re);
  if (!m) return src;
  const names = m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const n of ["StandardGameOverOverlay", "useStandardGameFeel"]) {
    if (!names.includes(n)) names.push(n);
  }
  names.sort((a, b) => a.localeCompare(b));
  return src.replace(re, `import {\n  ${names.join(",\n  ")},\n} from "@game-platform/game-sdk";`);
}

function patchUiImport(src) {
  return src.replace(/,\s*GameOverOverlay\b|\bGameOverOverlay,\s*/g, "");
}

function patchFeelHook(src) {
  if (src.includes("useStandardGameFeel(")) return src;
  if (!src.includes("const GAME_SLUG")) return src;
  const extras = [
    src.includes("state.stageIndex") ? "stageIndex: state.stageIndex" : null,
    src.includes("fieldRef") ? "fieldRef" : null,
    src.includes('"bubble-pop"') ? "muteScoreGain: true" : null,
  ]
    .filter(Boolean)
    .map((e) => `    ${e},`)
    .join("\n");
  const block = `\n  const feel = useStandardGameFeel(GAME_SLUG, {\n    status: state.status,\n    score: state.score,\n${extras}\n  });`;
  if (src.includes("const { reportScore } = useGameSDK();")) {
    return src.replace(
      "const { reportScore } = useGameSDK();",
      `const { reportScore } = useGameSDK();${block}`
    );
  }
  return src;
}

function patchOverlayName(src) {
  return src.replace(/\bGameOverOverlay\b/g, "StandardGameOverOverlay");
}

function patchOverlayProps(src) {
  if (!src.includes("StandardGameOverOverlay")) return src;
  if (src.includes("feel.isNewBest")) return src;

  src = src.replace(
    /gameSlug=\{GAME_SLUG\}/g,
    "gameSlug={GAME_SLUG}\n            isNewBest={feel.isNewBest}\n            bestRecordDelta={feel.bestRecordDelta}"
  );

  if (!src.includes("onExit={feel.handleExit}")) {
    src = src.replace(
      /(<StandardGameOverOverlay[\s\S]*?)(\n\s*onRetry=)/g,
      "$1\n            onExit={feel.handleExit}$2"
    );
  }
  return src;
}

function patchShellClass(src) {
  if (src.includes("standard-game-shell")) return src;
  return src.replace(
    /return \(\s*\n(\s*)<div className="(relative flex flex-col[^"]*)">/,
    'return (\n$1<div className="standard-game-shell $2 mx-auto w-full">'
  );
}

async function patchGame(slug) {
  const file = await findGameFile(slug);
  if (!file) return { slug, status: "SKIP" };
  let src = await readFile(file, "utf8");
  const before = src;
  src = patchSdkImport(src);
  src = patchUiImport(src);
  src = patchFeelHook(src);
  src = patchOverlayName(src);
  src = patchOverlayProps(src);
  src = patchShellClass(src);
  if (src !== before) {
    await writeFile(file, src, "utf8");
    return { slug, status: "PATCHED" };
  }
  return { slug, status: "UNCHANGED" };
}

async function main() {
  const playable = await readFile(path.join(REPO, "apps/web/lib/playable-games.ts"), "utf8");
  const slugs = playable.match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
  const results = [];
  for (const slug of slugs) results.push(await patchGame(slug));
  console.log(`Patched ${results.filter((r) => r.status === "PATCHED").length}/${slugs.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
