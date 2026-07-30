"use client";

import type { ReactNode, RefObject } from "react";
import { useRef } from "react";

import { cn } from "@game-platform/ui";

import type { EffectBurst } from "./effects";
import { GameFeelLayer } from "./game-feel-layer";

/** Puzzle-group play area — max-width, field ref, feel bursts. */
export function PuzzlePlayField({
  children,
  className,
  bursts,
  fieldRef: externalRef,
}: {
  children: ReactNode;
  className?: string;
  bursts?: readonly EffectBurst[];
  fieldRef?: RefObject<HTMLDivElement | null>;
}) {
  const internalRef = useRef<HTMLDivElement>(null);
  const fieldRef = externalRef ?? internalRef;

  return (
    <div
      ref={fieldRef}
      className={cn(
        "relative mx-auto w-full max-w-sm touch-manipulation overflow-hidden",
        className
      )}
    >
      {children}
      {bursts?.length ? <GameFeelLayer bursts={bursts} /> : null}
    </div>
  );
}
