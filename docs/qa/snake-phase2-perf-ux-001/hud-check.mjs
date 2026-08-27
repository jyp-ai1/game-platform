/**
 * SNAKE-PERF/UX-001 — HUD boost label check (static string contract).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));
const SRC = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../games/snake/src/SnakeIo.tsx"
);

mkdirSync(OUT, { recursive: true });
const src = readFileSync(SRC, "utf8");

const hasPcBoost = src.includes("SPACEBAR : BOOST");
const hasMobileBoost = /lg:hidden">BOOST<\/span>/.test(src);
const noBooster = !src.includes("SPACEBAR : BOOSTER");
const noArrowHint = !/방향키|Arrow keys|WASD/i.test(src);

const pass = hasPcBoost && hasMobileBoost && noBooster && noArrowHint;

const report = {
  testedAt: new Date().toISOString(),
  hasPcBoost,
  hasMobileBoost,
  noBooster,
  noArrowHint,
  pass,
  verdict: pass ? "PASS" : "FAIL",
};

writeFileSync(join(OUT, "hud-check.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(pass ? 0 : 1);
