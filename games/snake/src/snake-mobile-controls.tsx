"use client";

import { cn } from "@game-platform/ui";

import type { Direction } from "./snake-io-engine";

interface SnakeMobileControlsProps {
  onDirection: (dir: Direction) => void;
  onBoostStart: () => void;
  onBoostEnd: () => void;
  boosting: boolean;
  boostReady: boolean;
}

function DirButton({
  label,
  dir,
  onDirection,
  className,
}: {
  label: string;
  dir: Direction;
  onDirection: (dir: Direction) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-lg border border-white/25 bg-black/60 text-lg font-bold text-white shadow-lg active:scale-95 active:bg-primary/30 touch-manipulation landscape:h-10 landscape:w-10",
        className
      )}
      onTouchStart={(e) => {
        e.preventDefault();
        onDirection(dir);
      }}
      onClick={() => onDirection(dir)}
    >
      {dir === "up" ? "↑" : dir === "down" ? "↓" : dir === "left" ? "←" : "→"}
    </button>
  );
}

/** Fixed D-pad + Boost — portrait/landscape, safe-area, always visible below lg. */
export function SnakeMobileControls({
  onDirection,
  onBoostStart,
  onBoostEnd,
  boosting,
  boostReady,
}: SnakeMobileControlsProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[250] flex justify-center lg:hidden"
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(0.5rem, env(safe-area-inset-left, 0px))",
        paddingRight: "max(0.5rem, env(safe-area-inset-right, 0px))",
      }}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-end justify-between gap-3 px-3 pb-1 landscape:max-w-2xl landscape:gap-4">
        <div className="grid shrink-0 grid-cols-3 grid-rows-3 gap-1 landscape:gap-0.5">
          <div className="col-start-2 row-start-1">
            <DirButton label="위" dir="up" onDirection={onDirection} />
          </div>
          <div className="col-start-1 row-start-2">
            <DirButton label="왼쪽" dir="left" onDirection={onDirection} />
          </div>
          <div className="col-start-3 row-start-2">
            <DirButton label="오른쪽" dir="right" onDirection={onDirection} />
          </div>
          <div className="col-start-2 row-start-3">
            <DirButton label="아래" dir="down" onDirection={onDirection} />
          </div>
        </div>

        <button
          type="button"
          className={cn(
            "flex h-14 min-w-[4.5rem] shrink-0 items-center justify-center rounded-xl border-2 px-3 text-xs font-bold uppercase tracking-wide touch-manipulation landscape:h-12",
            boosting
              ? "border-amber-300 bg-amber-400/30 text-amber-100 shadow-[0_0_20px_#fbbf24]"
              : boostReady
                ? "border-white/30 bg-black/60 text-white active:scale-95"
                : "border-white/10 bg-black/40 text-white/40"
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
    </div>
  );
}
