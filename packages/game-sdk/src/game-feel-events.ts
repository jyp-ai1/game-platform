/**
 * Sprint 14.2 — per-action game feel (Sound + Effect).
 * Games call playGameFeel() at interaction points; not a substitute for rules/difficulty.
 */
import {
  createEffectBurst,
  triggerEffect,
  triggerScreenShake,
  type EffectBurst,
} from "./effects";
import {
  playClickSound,
  playComboSound,
  playCorrectSound,
  playExplosionSound,
  playFailSound,
  playFlagSound,
  playFlipSound,
  playGoalSound,
  playLineClearSound,
  playMergeSound,
  playPopSound,
  playSuccessSound,
} from "./sound";

export type GameFeelEvent =
  | "button"
  | "merge"
  | "flip"
  | "match"
  | "wrong"
  | "line-clear"
  | "explosion"
  | "flag"
  | "goal"
  | "pop"
  | "correct"
  | "combo";

export function playGameFeel(
  event: GameFeelEvent,
  target?: HTMLElement | null,
  position?: { xPct?: number; yPct?: number }
): EffectBurst {
  const xPct = position?.xPct ?? 50;
  const yPct = position?.yPct ?? 50;

  switch (event) {
    case "button":
      playClickSound();
      return createEffectBurst("pop", xPct, yPct);
    case "merge":
      playMergeSound();
      if (target) {
        target.classList.add("game-effect-merge");
        window.setTimeout(() => target.classList.remove("game-effect-merge"), 220);
      }
      return createEffectBurst("scale", xPct, yPct);
    case "flip":
      playFlipSound();
      if (target) {
        target.classList.add("game-effect-flip");
        window.setTimeout(() => target.classList.remove("game-effect-flip"), 280);
      }
      return createEffectBurst("flash", xPct, yPct);
    case "match":
    case "correct":
      playCorrectSound();
      triggerEffect("success", target);
      return createEffectBurst("success", xPct, yPct);
    case "wrong":
      playFailSound();
      triggerScreenShake(target ?? undefined);
      return createEffectBurst("shake", xPct, yPct);
    case "line-clear":
      playLineClearSound();
      triggerScreenShake(target ?? undefined);
      triggerEffect("flash", target);
      return createEffectBurst("combo", xPct, yPct);
    case "explosion":
      playExplosionSound();
      triggerScreenShake(target ?? undefined);
      return createEffectBurst("particle", xPct, yPct, "#ef4444");
    case "flag":
      playFlagSound();
      return createEffectBurst("pop", xPct, yPct);
    case "goal":
      playGoalSound();
      triggerEffect("combo", target);
      return createEffectBurst("combo", xPct, yPct);
    case "pop":
      playPopSound();
      return triggerEffect("pop", target);
    case "combo":
      playComboSound();
      return triggerEffect("combo", target);
    default:
      playSuccessSound();
      return createEffectBurst("success", xPct, yPct);
  }
}
