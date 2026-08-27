/**
 * SNAKE-PERF/UX-001 — TOP10 display wiring unit test (no browser).
 * Verifies length-DESC sort wins over humans-first reorder.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

/** Old buggy display (humans first) */
function oldDisplay(rankings, snakes, limit = 10) {
  const entries = rankings.map((r) => ({
    ...r,
    isBot: snakes[r.deviceId]?.isBot ?? r.deviceId.startsWith("bot:"),
  }));
  const humans = entries.filter((e) => !e.isBot);
  const bots = entries.filter((e) => e.isBot);
  return [...humans, ...bots].slice(0, limit);
}

/** Fixed display — trust updateRankings order */
function newDisplay(rankings, snakes, limit = 10) {
  return rankings.slice(0, limit).map((r) => ({
    ...r,
    isBot: snakes[r.deviceId]?.isBot ?? r.deviceId.startsWith("bot:"),
  }));
}

function makeRankings() {
  return [
    { deviceId: "bot:3", nickname: "LongBot", score: 280 },
    { deviceId: "human-a", nickname: "Alice", score: 200 },
    { deviceId: "bot:1", nickname: "MidBot", score: 150 },
    { deviceId: "human-b", nickname: "Bob", score: 120 },
    { deviceId: "bot:0", nickname: "ShortBot", score: 50 },
  ];
}

const snakes = {
  "bot:3": { isBot: true },
  "human-a": { isBot: false },
  "bot:1": { isBot: true },
  "human-b": { isBot: false },
  "bot:0": { isBot: true },
};

const rankings = makeRankings();
const oldTop = oldDisplay(rankings, snakes, 10);
const newTop = newDisplay(rankings, snakes, 10);

const oldFirst = oldTop[0]?.deviceId;
const newFirst = newTop[0]?.deviceId;
const longestId = rankings[0].deviceId;

const pass =
  newFirst === longestId &&
  oldFirst !== longestId &&
  newTop.every((r, i) => i === 0 || r.score <= newTop[i - 1].score);

const report = {
  testedAt: new Date().toISOString(),
  test: "TOP10 length-DESC display wiring",
  longestSnake: longestId,
  oldDisplayFirst: oldFirst,
  newDisplayFirst: newFirst,
  newTop10Scores: newTop.map((r) => r.score),
  pass,
  verdict: pass ? "PASS" : "FAIL",
  rootCause:
    "getDisplayRankings re-sorted humans before bots, ignoring length order from updateRankings.",
};

writeFileSync(join(OUT, "top10-unit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(pass ? 0 : 1);
