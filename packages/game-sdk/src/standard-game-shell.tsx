"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@game-platform/ui";

import type { EffectBurst } from "./effects";
import { GameFeelLayer } from "./game-feel-layer";

/** Responsive canvas wrapper — applied to all single-player games. */
export function StandardGameShell({
  children,
  className,
  style,
  aspectRatio,
  bursts,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  aspectRatio?: string;
  bursts?: readonly EffectBurst[];
}) {
  return (
    <div
      className={cn(
        "standard-game-shell mx-auto flex w-full max-w-[min(100%,20rem)] flex-col gap-3",
        "sm:max-w-[min(100%,24rem)] lg:max-w-[min(100%,28rem)] xl:max-w-[min(100%,32rem)]",
        className
      )}
      style={style}
    >
      {aspectRatio ? (
        <div
          className="standard-game-canvas relative w-full overflow-hidden rounded-xl border border-border/60 bg-muted/30"
          style={{ aspectRatio, maxHeight: "min(56vh, 26rem)" }}
        >
          {children}
          {bursts?.length ? <GameFeelLayer bursts={bursts} /> : null}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
