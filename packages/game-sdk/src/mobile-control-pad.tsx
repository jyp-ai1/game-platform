"use client";

import { cn } from "@game-platform/ui";

export type PadDirection = "up" | "down" | "left" | "right";

export type MobileControlAction = {
  id: string;
  label: string;
  /** hold = press/release; tap = fire once on press */
  mode?: "hold" | "tap";
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  onRelease?: () => void;
};

export type MobileControlPadProps = {
  onDirection?: (dir: PadDirection) => void;
  onDirectionEnd?: () => void;
  actions?: MobileControlAction[];
  className?: string;
};

const DIR_ARROW: Record<PadDirection, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

function DirButton({
  dir,
  onDirection,
}: {
  dir: PadDirection;
  onDirection: (dir: PadDirection) => void;
}) {
  return (
    <button
      type="button"
      aria-label={dir}
      data-testid={`mp-pad-${dir}`}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/65 text-lg font-bold text-white shadow-lg active:scale-95 active:bg-primary/30 touch-manipulation landscape:h-10 landscape:w-10"
      onTouchStart={(e) => {
        e.preventDefault();
        onDirection(dir);
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        onDirection(dir);
      }}
    >
      {DIR_ARROW[dir]}
    </button>
  );
}

function ActionButton({ action }: { action: MobileControlAction }) {
  const mode = action.mode ?? "tap";
  const fire = () => {
    if (action.disabled) return;
    action.onPress();
  };
  const release = () => {
    if (mode === "hold") action.onRelease?.();
  };

  return (
    <button
      type="button"
      data-testid={`mp-pad-action-${action.id}`}
      disabled={action.disabled}
      className={cn(
        "flex h-14 min-w-[4.5rem] shrink-0 items-center justify-center rounded-full border-2 px-3 text-xs font-bold uppercase tracking-wide touch-manipulation landscape:h-12",
        action.active
          ? "border-amber-300 bg-amber-400/30 text-amber-100 shadow-[0_0_20px_#fbbf24]"
          : action.disabled
            ? "border-white/10 bg-black/40 text-white/40"
            : "border-white/30 bg-black/60 text-white active:scale-95"
      )}
      onTouchStart={(e) => {
        e.preventDefault();
        fire();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        release();
      }}
      onTouchCancel={release}
      onMouseDown={(e) => {
        e.preventDefault();
        fire();
      }}
      onMouseUp={release}
      onMouseLeave={release}
    >
      {action.label}
    </button>
  );
}

/**
 * Brawl Stars–style mobile pad: left D-pad (round), right labeled actions.
 * Visible below `lg` only; does not cover board center.
 */
export function MobileControlPad({
  onDirection,
  onDirectionEnd,
  actions = [],
  className,
}: MobileControlPadProps) {
  const emitDir = (dir: PadDirection) => {
    onDirection?.(dir);
  };

  return (
    <div
      data-testid="mp-mobile-control-pad"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-[250] flex justify-center lg:hidden",
        className
      )}
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(0.5rem, env(safe-area-inset-left, 0px))",
        paddingRight: "max(0.5rem, env(safe-area-inset-right, 0px))",
      }}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-end justify-between gap-3 px-3 pb-1 landscape:max-w-2xl landscape:gap-4">
        <div
          className="relative flex h-[8.25rem] w-[8.25rem] shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/45 shadow-lg landscape:h-[7.5rem] landscape:w-[7.5rem]"
          onTouchEnd={() => onDirectionEnd?.()}
          onMouseUp={() => onDirectionEnd?.()}
          onMouseLeave={() => onDirectionEnd?.()}
        >
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 place-items-center gap-0 p-1.5">
            <div className="col-start-2 row-start-1">
              {onDirection ? <DirButton dir="up" onDirection={emitDir} /> : null}
            </div>
            <div className="col-start-1 row-start-2">
              {onDirection ? <DirButton dir="left" onDirection={emitDir} /> : null}
            </div>
            <div className="col-start-2 row-start-2">
              <div className="h-3 w-3 rounded-full bg-white/15" aria-hidden />
            </div>
            <div className="col-start-3 row-start-2">
              {onDirection ? <DirButton dir="right" onDirection={emitDir} /> : null}
            </div>
            <div className="col-start-2 row-start-3">
              {onDirection ? <DirButton dir="down" onDirection={emitDir} /> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {actions.map((action) => (
            <ActionButton key={action.id} action={action} />
          ))}
        </div>
      </div>
    </div>
  );
}
