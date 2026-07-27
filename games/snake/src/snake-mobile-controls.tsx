"use client";

import { cn } from "@game-platform/ui";
import { useCallback, useRef, useState } from "react";

import type { Direction } from "./snake-io-engine";
import { SNAKE_FEEL } from "./snake-feel-tuning";

interface SnakeMobileControlsProps {
  onDirection: (dir: Direction) => void;
  onBoostStart: () => void;
  onBoostEnd: () => void;
  boosting: boolean;
  boostReady: boolean;
}

const JOY_RADIUS = 52;
const KNOB_RADIUS = 22;

/** Floating joystick (left) + boost button (right) for mobile play. */
export function SnakeMobileControls({
  onDirection,
  onBoostStart,
  onBoostEnd,
  boosting,
  boostReady,
}: SnakeMobileControlsProps) {
  const baseRef = useRef<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const lastDirRef = useRef<Direction | null>(null);

  const emitFromDelta = useCallback(
    (dx: number, dy: number) => {
      if (Math.hypot(dx, dy) < SNAKE_FEEL.mobileSwipeThreshold) return;
      const dir: Direction =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      if (lastDirRef.current !== dir) {
        lastDirRef.current = dir;
        onDirection(dir);
      }
    },
    [onDirection]
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex items-end justify-between px-4 md:hidden">
      <div
        className="pointer-events-auto relative touch-none"
        style={{ width: JOY_RADIUS * 2, height: JOY_RADIUS * 2 }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          baseRef.current = { x: t.clientX, y: t.clientY };
          setActive(true);
          setKnob({ x: 0, y: 0 });
        }}
        onTouchMove={(e) => {
          const base = baseRef.current;
          const t = e.touches[0];
          if (!base || !t) return;
          e.preventDefault();
          let dx = t.clientX - base.x;
          let dy = t.clientY - base.y;
          const dist = Math.hypot(dx, dy);
          if (dist > JOY_RADIUS) {
            dx = (dx / dist) * JOY_RADIUS;
            dy = (dy / dist) * JOY_RADIUS;
          }
          setKnob({ x: dx, y: dy });
          emitFromDelta(dx, dy);
        }}
        onTouchEnd={() => {
          baseRef.current = null;
          setActive(false);
          setKnob({ x: 0, y: 0 });
          lastDirRef.current = null;
        }}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full border border-white/20 bg-black/40 backdrop-blur-sm",
            active && "border-primary/50 bg-primary/10"
          )}
        />
        <div
          className="absolute rounded-full bg-white/90 shadow-lg"
          style={{
            width: KNOB_RADIUS * 2,
            height: KNOB_RADIUS * 2,
            left: JOY_RADIUS - KNOB_RADIUS + knob.x,
            top: JOY_RADIUS - KNOB_RADIUS + knob.y,
          }}
        />
      </div>

      <button
        type="button"
        className={cn(
          "pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border-2 text-xs font-bold uppercase tracking-wide touch-none",
          boosting
            ? "border-amber-300 bg-amber-400/30 text-amber-100 shadow-[0_0_20px_#fbbf24]"
            : boostReady
              ? "border-white/30 bg-black/50 text-white active:scale-95"
              : "border-white/10 bg-black/30 text-white/40"
        )}
        onTouchStart={(e) => {
          e.preventDefault();
          if (boostReady) onBoostStart();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          onBoostEnd();
        }}
        onMouseDown={() => boostReady && onBoostStart()}
        onMouseUp={onBoostEnd}
        onMouseLeave={onBoostEnd}
      >
        Boost
      </button>
    </div>
  );
}
