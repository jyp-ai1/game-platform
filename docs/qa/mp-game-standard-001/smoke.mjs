/**
 * MP-GAME-STANDARD-001 — scoped smoke (metadata + difficulty labels + play hrefs).
 * Run: node docs/qa/mp-game-standard-001/smoke.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");

const entrySrc = fs.readFileSync(
  path.join(root, "packages/game-sdk/src/multiplayer-entry-select.tsx"),
  "utf8"
);
const metaSrc = fs.readFileSync(
  path.join(root, "packages/game-sdk/src/game-metadata.ts"),
  "utf8"
);
const catalogSrc = fs.readFileSync(path.join(root, "apps/web/lib/game-catalog.ts"), "utf8");
const localSrc = fs.readFileSync(path.join(root, "apps/web/lib/local-mvp-games.ts"), "utf8");
const detailSrc = fs.readFileSync(
  path.join(root, "apps/web/components/game-detail-template.tsx"),
  "utf8"
);

assert.match(entrySrc, /label: "Easy", emoji: "🟢"/);
assert.match(entrySrc, /label: "Normal", emoji: "🟡"/);
assert.match(entrySrc, /label: "Hard", emoji: "🔴"/);
assert.match(entrySrc, /DEFAULT_MP_AI_DIFFICULTY: MpAiDifficulty = "normal"/);
assert.match(entrySrc, /\{d\.emoji\}.*\{d\.label\}/s);

assert.match(metaSrc, /gameType: GameType/);
assert.match(metaSrc, /difficulty: SessionDifficulty/);
assert.match(metaSrc, /"multiplayer" \| "singleplayer"/);

assert.match(catalogSrc, /difficulty: SessionDifficulty/);
assert.match(catalogSrc, /gameType: GameType/);
assert.match(catalogSrc, /bomber"\) return "\/games\/bomber\/play\?room=WORLD"/);

assert.match(localSrc, /sessionDifficulty: "normal"/);
assert.match(localSrc, /buildLocalMvpCreatorMeta/);

assert.match(detailSrc, /game-detail-difficulty/);
assert.match(detailSrc, /MpWorldPlayLink/);
assert.match(detailSrc, /MP_AI_DIFFICULTIES/);

const agarEngine = fs.readFileSync(
  path.join(root, "games/agar/src/agar-io-engine.ts"),
  "utf8"
);
assert.match(agarEngine, /agarBotCountForDifficulty/);
assert.match(agarEngine, /tier === "easy"\) return 12/);
assert.match(agarEngine, /tier === "hard"\) return 24/);

const bomber = fs.readFileSync(path.join(root, "games/bomber/src/Bomber.tsx"), "utf8");
assert.match(bomber, /return "WORLD"/);
assert.match(bomber, /onDifficultyChange=\{setAiDifficulty\}/);

const agarUi = fs.readFileSync(path.join(root, "games/agar/src/Agar.tsx"), "utf8");
assert.match(agarUi, /onDifficultyChange=\{setAiDifficulty\}/);
assert.match(agarUi, /MultiplayerEntrySelect/);
assert.match(agarUi, /MultiplayerPlayShell/);

const report = {
  ok: true,
  checks: [
    "difficulty emoji labels",
    "default normal",
    "creator metadata shape",
    "catalog difficulty+gameType",
    "detail difficulty strip + MpWorldPlayLink",
    "agar bot count by difficulty",
    "bomber WORLD room + difficulty wiring",
  ],
};

fs.writeFileSync(
  path.join(__dirname, "smoke-report.json"),
  JSON.stringify(report, null, 2)
);
console.log(JSON.stringify(report, null, 2));
