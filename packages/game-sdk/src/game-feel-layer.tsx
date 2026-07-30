"use client";

import { cn } from "@game-platform/ui";

import type { EffectBurst } from "./effects";

/** Renders score/action particle bursts from useStandardGameFeel. */
export function GameFeelLayer({ bursts }: { bursts: readonly EffectBurst[] }) {
  if (!bursts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-hidden>
      {bursts.map((burst) => (
        <span
          key={burst.id}
          className={cn(
            "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
            burst.kind === "combo" && "bg-amber-400/90 shadow-[0_0_12px_rgba(251,191,36,0.8)]",
            burst.kind === "success" && "bg-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.7)]",
            burst.kind === "pop" && "bg-primary/80",
            burst.kind === "particle" && "size-4 bg-red-500/80",
            burst.kind === "shake" && "bg-destructive/70",
            burst.kind === "flash" && "bg-white/70",
            burst.kind === "scale" && "size-4 bg-violet-400/80"
          )}
          style={{
            left: `${burst.xPct}%`,
            top: `${burst.yPct}%`,
            opacity: Math.max(0, burst.life),
            transform: `translate(-50%, -50%) scale(${0.6 + burst.life * 0.6})`,
          }}
        />
      ))}
    </div>
  );
}
