/**
 * Sprint 18 — Platform Game Contract (inherited by every new game).
 *
 * Flow (canonical):
 *   HOME → Re:Play → DETAIL → PLAY → CHARACTER → COLOR → [DIFFICULTY?] → ENTER → GAME → DEATH → RETRY/EXIT
 *
 * MP (Snake / Agar / Bomber): Character → Color → Enter → World  (no Difficulty UI)
 * Solo: Character → Color → Difficulty → Enter
 * Mobile: left D-pad · right actions (`MobileControlPad`)
 *
 * Do not invent per-game alternate entry shells. Reuse MultiplayerEntrySelect + Detail template.
 */

import { isMultiplayerGameSlug, type GameType } from "./game-metadata";

/** Canonical player journey steps (platform shell). */
export const PLATFORM_JOURNEY = [
  "HOME",
  "REPLAY",
  "DETAIL",
  "PLAY",
  "CHARACTER",
  "COLOR",
  "ENTER",
  "GAME",
  "DEATH",
  "RETRY_OR_EXIT",
] as const;

export type PlatformJourneyStep = (typeof PLATFORM_JOURNEY)[number];

/** Entry lobby mode — drives Difficulty visibility. */
export type PlatformEntryMode = "multiplayer" | "solo";

export type PlatformEntrySteps = {
  character: true;
  color: true;
  /** Solo only — MP must omit difficulty picker. */
  difficulty: boolean;
  enter: true;
};

export type PlatformGameContractMeta = {
  slug: string;
  gameType: GameType;
  entryMode: PlatformEntryMode;
  entrySteps: PlatformEntrySteps;
  /** Mobile control pad required for realtime WORLD titles. */
  mobileControlPad: boolean;
  /** Shared death overlay (RETRY / EXIT). */
  deathOverlay: boolean;
  /** Detail CTA copy key. */
  detailCta: "WORLD_PLAY" | "PLAY";
  /** Known HOLD deviations (document only — do not “fix” Bomber map lobby here). */
  knownDeviations: string[];
};

export const PLATFORM_FLAGSHIP_MP_SLUGS = ["snake", "agar", "bomber"] as const;

export function resolveEntryMode(slug: string): PlatformEntryMode {
  return isMultiplayerGameSlug(slug) ? "multiplayer" : "solo";
}

export function entryStepsForMode(mode: PlatformEntryMode): PlatformEntrySteps {
  return {
    character: true,
    color: true,
    difficulty: mode === "solo",
    enter: true,
  };
}

/**
 * Metadata checklist for Creator / new games — all must be true before publish.
 * Enforce in catalog + entry shell; do not add alternate flows per game.
 */
export type PlatformContractChecklist = {
  usesSharedDetailTemplate: boolean;
  usesSharedEntrySelect: boolean;
  mpOmitsDifficulty: boolean;
  soloOffersDifficulty: boolean;
  mobilePadContract: boolean;
  deathRetryExit: boolean;
  soloPreservedOnHome: boolean;
};

export const PLATFORM_CONTRACT_CHECKLIST_KEYS: readonly (keyof PlatformContractChecklist)[] = [
  "usesSharedDetailTemplate",
  "usesSharedEntrySelect",
  "mpOmitsDifficulty",
  "soloOffersDifficulty",
  "mobilePadContract",
  "deathRetryExit",
  "soloPreservedOnHome",
] as const;

/** Build contract view-model for a catalog slug (no DB). */
export function buildPlatformGameContract(slug: string): PlatformGameContractMeta {
  const entryMode = resolveEntryMode(slug);
  const mp = entryMode === "multiplayer";
  const knownDeviations: string[] = [];
  // Bomber keeps an optional map-select after ENTER (HOLD — do not deepen).
  if (slug === "bomber") {
    knownDeviations.push("bomber:map-select-after-enter (HOLD)");
  }
  return {
    slug,
    gameType: mp ? "multiplayer" : "singleplayer",
    entryMode,
    entrySteps: entryStepsForMode(entryMode),
    mobileControlPad: mp,
    deathOverlay: true,
    detailCta: mp ? "WORLD_PLAY" : "PLAY",
    knownDeviations,
  };
}

/** Validate lobby props against contract (call from entry shells / QA). */
export function assertEntryLobbyContract(opts: {
  mode: PlatformEntryMode;
  showColorStep: boolean;
  hasDifficultyHandler: boolean;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!opts.showColorStep) {
    errors.push("Color step required (Character → Color → Enter)");
  }
  if (opts.mode === "multiplayer" && opts.hasDifficultyHandler) {
    errors.push("MP lobby must omit Difficulty (Character → Color → Enter only)");
  }
  if (opts.mode === "solo" && !opts.hasDifficultyHandler) {
    errors.push("Solo lobby must offer Difficulty before Enter");
  }
  return { ok: errors.length === 0, errors };
}

/** Regression: flagship trio must share MP entry contract. */
export function flagshipMpContractSmoke(): {
  ok: boolean;
  bySlug: Record<string, PlatformGameContractMeta>;
} {
  const bySlug: Record<string, PlatformGameContractMeta> = {};
  let ok = true;
  for (const slug of PLATFORM_FLAGSHIP_MP_SLUGS) {
    const meta = buildPlatformGameContract(slug);
    bySlug[slug] = meta;
    if (meta.entryMode !== "multiplayer") ok = false;
    if (meta.entrySteps.difficulty) ok = false;
    if (meta.detailCta !== "WORLD_PLAY") ok = false;
  }
  return { ok, bySlug };
}
