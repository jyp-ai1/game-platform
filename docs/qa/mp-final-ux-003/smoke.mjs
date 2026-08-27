/**
 * MP-FINAL-UX-003 + GAME-P0-003 — static + optional Playwright smoke.
 * Run: node docs/qa/mp-final-ux-003/smoke.mjs
 * Optional: QA_BASE_URL=https://game29-xxx.vercel.app node docs/qa/mp-final-ux-003/smoke.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const outDir = __dirname;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (e) {
    checks.push({ name, ok: false, error: String(e?.message ?? e) });
  }
}

const mpDiff = read("packages/game-sdk/src/mp-difficulty.ts");
const entry = read("packages/game-sdk/src/multiplayer-entry-select.tsx");
const snakeSelect = read("games/snake/src/SnakeCharacterSelect.tsx");
const snakePlay = read("apps/web/components/snake-io-play-client.tsx");
const agar = read("games/agar/src/Agar.tsx");
const bomber = read("games/bomber/src/Bomber.tsx");
const bomberEngine = read("games/bomber/src/bomber-engine.ts");
const detail = read("apps/web/components/game-detail-template.tsx");
const header = read("apps/web/components/header.tsx");
const snakeFeel = read("games/snake/src/snake-feel.ts");
const snakeAi = read("games/snake/src/snake-ai-fill.ts");

check("mp-default-hard", () => {
  assert.match(mpDiff, /DEFAULT_MP_AI_DIFFICULTY: MpAiDifficulty = "hard"/);
});

check("mp-no-difficulty-snake", () => {
  assert.doesNotMatch(snakeSelect, /onDifficultyChange/);
  assert.match(snakeSelect, /캐릭터 선택 후 ENTER/);
});

check("mp-no-difficulty-agar", () => {
  assert.doesNotMatch(agar, /onDifficultyChange/);
});

check("mp-no-difficulty-bomber", () => {
  assert.doesNotMatch(bomber, /onDifficultyChange/);
});

check("solo-difficulty-labels", () => {
  assert.match(mpDiff, /label: "NORMAL"/);
  assert.match(mpDiff, /label: "HARD"/);
  assert.match(mpDiff, /label: "SUPER HARD"/);
});

check("detail-character-enter", () => {
  assert.match(detail, /Character → ENTER/);
  assert.doesNotMatch(detail, /game-detail-difficulty/);
});

check("ai-creator-soon-badge", () => {
  assert.match(header, /nav-ai-creator-soon/);
  assert.match(header, /SOON/);
});

check("snake-loot-sfx", () => {
  assert.match(snakeFeel, /playLootGemSound/);
});

check("snake-ai-food-priority", () => {
  assert.match(snakeAi, /else if \(food\) state = "chase"/);
});

check("bomber-3-rounds", () => {
  assert.match(bomberEngine, /BOMBER_MAX_ROUNDS = 3/);
});

check("bomber-powerups", () => {
  assert.match(bomberEngine, /PowerUpKind/);
  assert.match(bomberEngine, /"bomb" \| "speed" \| "range"/);
  assert.match(bomber, /bomber-powerup/);
});

check("bomber-bomb-z30", () => {
  assert.match(bomber, /z-30/);
  assert.match(bomber, /bomber-bomb/);
});

const report = {
  ok: checks.every((c) => c.ok),
  checks,
  at: new Date().toISOString(),
};

fs.writeFileSync(path.join(outDir, "smoke-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
