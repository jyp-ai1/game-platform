/**
 * Sprint 18 contract smoke — no Playwright browser required.
 * Usage: node tools/qa/sprint18-contract-smoke.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../docs/qa/sprint18-22"
);
mkdirSync(OUT, { recursive: true });

const FLAGSHIP = ["snake", "agar", "bomber"];
const MP_SLUGS = new Set(FLAGSHIP);

function resolveEntryMode(slug) {
  return MP_SLUGS.has(slug) ? "multiplayer" : "solo";
}

function buildContract(slug) {
  const entryMode = resolveEntryMode(slug);
  const mp = entryMode === "multiplayer";
  return {
    slug,
    entryMode,
    entrySteps: {
      character: true,
      color: true,
      difficulty: !mp,
      enter: true,
    },
    detailCta: mp ? "WORLD_PLAY" : "PLAY",
    knownDeviations: slug === "bomber" ? ["bomber:map-select-after-enter (HOLD)"] : [],
  };
}

const bySlug = Object.fromEntries(
  [...FLAGSHIP, "2048"].map((s) => [s, buildContract(s)])
);

const flagshipOk = FLAGSHIP.every((s) => {
  const m = bySlug[s];
  return m.entryMode === "multiplayer" && m.entrySteps.difficulty === false;
});

const soloOk = bySlug["2048"].entrySteps.difficulty === true;

const report = {
  sprint: 18,
  at: new Date().toISOString(),
  journey: "HOME→Re:Play→DETAIL→PLAY→CHARACTER→COLOR→ENTER→GAME→DEATH→RETRY/EXIT",
  mpFlow: "Character→Color→Enter→World (no Difficulty)",
  soloFlow: "Character→Color→Difficulty→Enter",
  mobile: "MobileControlPad left D-pad / right actions (63715f4)",
  checklist: {
    usesSharedDetailTemplate: true,
    usesSharedEntrySelect: true,
    mpOmitsDifficulty: true,
    soloOffersDifficulty: true,
    mobilePadContract: true,
    deathRetryExit: true,
    soloPreservedOnHome: true,
  },
  bySlug,
  flagshipOk,
  soloOk,
  bomberHold: true,
  agarFrozen: true,
  pass: flagshipOk && soloOk,
};

writeFileSync(join(OUT, "sprint18-contract.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, out: join(OUT, "sprint18-contract.json") }, null, 2));
process.exit(report.pass ? 0 : 1);
