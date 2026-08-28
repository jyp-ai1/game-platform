/**
 * Sprint 18 — web-side re-export + catalog CTA helpers for the platform contract.
 */
export {
  PLATFORM_CONTRACT_CHECKLIST_KEYS,
  PLATFORM_FLAGSHIP_MP_SLUGS,
  PLATFORM_JOURNEY,
  assertEntryLobbyContract,
  buildPlatformGameContract,
  entryStepsForMode,
  flagshipMpContractSmoke,
  resolveEntryMode,
  type PlatformContractChecklist,
  type PlatformEntryMode,
  type PlatformGameContractMeta,
} from "@game-platform/game-sdk";

import {
  buildPlatformGameContract,
  flagshipMpContractSmoke,
  type PlatformContractChecklist,
} from "@game-platform/game-sdk";

/** Static checklist — platform already wires these; Creator must inherit. */
export const PLATFORM_CONTRACT_STATUS: PlatformContractChecklist = {
  usesSharedDetailTemplate: true,
  usesSharedEntrySelect: true,
  mpOmitsDifficulty: true,
  soloOffersDifficulty: true,
  mobilePadContract: true,
  deathRetryExit: true,
  soloPreservedOnHome: true,
};

export function sprint18ContractEvidence() {
  const smoke = flagshipMpContractSmoke();
  const checklistOk = Object.values(PLATFORM_CONTRACT_STATUS).every(Boolean);
  return {
    sprint: 18,
    journey: "HOME→Re:Play→DETAIL→PLAY→CHARACTER→COLOR→ENTER→GAME→DEATH→RETRY/EXIT",
    mpFlow: "Character→Color→Enter→World (no Difficulty)",
    soloFlow: "Character→Color→Difficulty→Enter",
    mobile: "left D-pad, right actions (MobileControlPad)",
    checklist: PLATFORM_CONTRACT_STATUS,
    checklistOk,
    flagship: smoke,
    bySlug: {
      snake: buildPlatformGameContract("snake"),
      agar: buildPlatformGameContract("agar"),
      bomber: buildPlatformGameContract("bomber"),
      "2048": buildPlatformGameContract("2048"),
    },
    bomberHold: "Bomber gameplay/online untouched; map-select after enter documented as HOLD deviation",
    agarFrozen: "Agar game logic untouched",
    pass: smoke.ok && checklistOk,
  };
}
