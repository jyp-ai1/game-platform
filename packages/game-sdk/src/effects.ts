/**
 * Sprint 14 — Effect Framework.
 * Games call these instead of ad-hoc particles / flash / shake.
 */
import { playComboSound, playPopSound, playSuccessSound } from "./sound";

export type EffectKind = "pop" | "flash" | "scale" | "particle" | "shake" | "combo" | "success";

export interface EffectBurst {
  id: number;
  kind: EffectKind;
  xPct: number;
  yPct: number;
  life: number;
  color?: string;
}

let burstId = 0;

export function createEffectBurst(
  kind: EffectKind,
  xPct = 50,
  yPct = 50,
  color?: string
): EffectBurst {
  return { id: burstId++, kind, xPct, yPct, life: 1, color };
}

/** Imperative feedback — sound + optional DOM flash on a target element. */
export function triggerEffect(
  kind: EffectKind,
  target?: HTMLElement | null
): EffectBurst {
  switch (kind) {
    case "pop":
      playPopSound();
      break;
    case "combo":
      playComboSound();
      break;
    case "success":
    case "scale":
    case "particle":
    case "flash":
      playSuccessSound();
      break;
    case "shake":
      playPopSound();
      break;
  }

  if (target) {
    target.classList.add("game-effect-flash");
    window.setTimeout(() => target.classList.remove("game-effect-flash"), 180);
  }

  return createEffectBurst(kind);
}

export function tickEffects(bursts: EffectBurst[], decay = 0.12): EffectBurst[] {
  return bursts
    .map((b) => ({ ...b, life: b.life - decay }))
    .filter((b) => b.life > 0);
}

/** CSS class games can add to root for global shake. */
export function triggerScreenShake(root?: HTMLElement | null): void {
  const el = root ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!el) return;
  el.classList.add("game-effect-shake");
  window.setTimeout(() => el.classList.remove("game-effect-shake"), 320);
}
