"use client";

import { cn } from "@game-platform/ui";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

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

export type FloatingMobilePadProps = {
  /** Discrete direction — fired on change and repeated while held */
  onDirection?: (dir: PadDirection) => void;
  onDirectionEnd?: () => void;
  /** Normalized steer vector (-1..1) for continuous aim (Agar) */
  onSteer?: (vx: number, vy: number) => void;
  actions?: MobileControlAction[];
  className?: string;
  /** Ms between repeated onDirection while joystick held (Bomber grid cadence) */
  repeatMs?: number;
};

const DEAD = 0.22;
const KNOB_R = 36;
const BASE_R = 52;

function vecToDir(vx: number, vy: number): PadDirection | null {
  if (Math.hypot(vx, vy) < DEAD) return null;
  if (Math.abs(vx) >= Math.abs(vy)) return vx > 0 ? "right" : "left";
  return vy > 0 ? "down" : "up";
}

function normSteer(dx: number, dy: number): { vx: number; vy: number } {
  const len = Math.hypot(dx, dy);
  if (len < 4) return { vx: 0, vy: 0 };
  const clamped = Math.min(len, KNOB_R);
  return { vx: (dx / len) * (clamped / KNOB_R), vy: (dy / len) * (clamped / KNOB_R) };
}

type Joy = {
  pointerId: number;
  cx: number;
  cy: number;
  vx: number;
  vy: number;
  dir: PadDirection | null;
};

/**
 * Dynamic floating mobile pad — default hidden.
 * Left half touch → joystick at touch point; right half → actions.
 */
export function FloatingMobilePad({
  onDirection,
  onDirectionEnd,
  onSteer,
  actions = [],
  className,
  repeatMs = 90,
}: FloatingMobilePadProps) {
  const [joy, setJoy] = useState<Joy | null>(null);
  const joyRef = useRef<Joy | null>(null);
  const holdRef = useRef<Map<number, string>>(new Map());
  const overlayRef = useRef<HTMLDivElement>(null);

  const syncJoy = useCallback((next: Joy | null) => {
    joyRef.current = next;
    setJoy(next);
  }, []);

  useEffect(() => {
    if (!onDirection || !joy?.dir) return;
    onDirection(joy.dir);
    const id = window.setInterval(() => {
      const j = joyRef.current;
      if (j?.dir) onDirection(j.dir);
    }, repeatMs);
    return () => window.clearInterval(id);
  }, [joy?.dir, onDirection, repeatMs]);

  useEffect(() => {
    if (!onSteer || !joy) return;
    let raf = 0;
    const loop = () => {
      const j = joyRef.current;
      if (j) onSteer(j.vx, j.vy);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [joy, onSteer]);

  const updateJoy = useCallback(
    (e: PointerEvent) => {
      const j = joyRef.current;
      if (!j || j.pointerId !== e.pointerId) return;
      const dx = e.clientX - j.cx;
      const dy = e.clientY - j.cy;
      const { vx, vy } = normSteer(dx, dy);
      const dir = vecToDir(vx, vy);
      syncJoy({ ...j, vx, vy, dir });
    },
    [syncJoy]
  );

  const endJoy = useCallback(
    (pointerId: number) => {
      if (joyRef.current?.pointerId !== pointerId) return;
      syncJoy(null);
      onDirectionEnd?.();
    },
    [onDirectionEnd, syncJoy]
  );

  const onOverlayDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const half = window.innerWidth / 2;
    if (e.clientX < half) {
      const state: Joy = {
        pointerId: e.pointerId,
        cx: e.clientX,
        cy: e.clientY,
        vx: 0,
        vy: 0,
        dir: null,
      };
      syncJoy(state);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onOverlayMove = (e: PointerEvent<HTMLDivElement>) => {
    updateJoy(e);
  };

  const onOverlayUp = (e: PointerEvent<HTMLDivElement>) => {
    endJoy(e.pointerId);
    const held = holdRef.current.get(e.pointerId);
    if (held) {
      const action = actions.find((a) => a.id === held);
      action?.onRelease?.();
      holdRef.current.delete(e.pointerId);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const fireAction = useCallback(
    (action: MobileControlAction, e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (action.disabled) return;
      action.onPress();
      if ((action.mode ?? "tap") === "hold") holdRef.current.set(e.pointerId, action.id);
    },
    []
  );

  const joyDir = joy?.dir;

  return (
    <div
      ref={overlayRef}
      data-testid="mp-mobile-control-pad"
      className={cn(
        "pointer-events-none fixed inset-0 z-[250] touch-none select-none lg:hidden",
        className
      )}
      style={{
        WebkitUserSelect: "none",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* Left-half joystick capture — only active zone receives pointer events */}
      <div
        className="pointer-events-auto absolute inset-y-0 left-0 w-1/2 touch-none"
        onPointerDown={onOverlayDown}
        onPointerMove={onOverlayMove}
        onPointerUp={onOverlayUp}
        onPointerCancel={onOverlayUp}
      />
      {joy ? (
        <div
          data-testid="mp-floating-joystick"
          data-touch-x={Math.round(joy.cx)}
          data-touch-y={Math.round(joy.cy)}
          className="pointer-events-none absolute"
          style={{ left: joy.cx - BASE_R, top: joy.cy - BASE_R, width: BASE_R * 2, height: BASE_R * 2 }}
        >
          <div className="absolute inset-0 rounded-full border border-white/25 bg-black/45 shadow-lg" />
          <div
            className="absolute rounded-full border-2 border-white/40 bg-primary/35 shadow-md"
            style={{
              width: KNOB_R,
              height: KNOB_R,
              left: BASE_R - KNOB_R / 2 + joy.vx * (BASE_R - KNOB_R / 2),
              top: BASE_R - KNOB_R / 2 + joy.vy * (BASE_R - KNOB_R / 2),
            }}
          />
          {(["up", "down", "left", "right"] as const).map((d) => (
            <span
              key={d}
              data-testid={`mp-pad-${d}`}
              className="sr-only"
              aria-hidden={joyDir !== d}
            />
          ))}
        </div>
      ) : null}

      {/* Visible action buttons — right side (Split / Eject) */}
      {actions.length > 0 ? (
        <div className="pointer-events-none absolute bottom-24 right-4 z-[260] flex flex-col gap-3">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              data-testid={`mp-pad-action-${action.id}`}
              disabled={action.disabled}
              aria-label={action.label}
              className={cn(
                "pointer-events-auto min-h-12 min-w-[5.5rem] touch-none select-none rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wide shadow-lg backdrop-blur-sm",
                action.active
                  ? "border-primary/60 bg-primary/35 text-white"
                  : "border-white/25 bg-black/55 text-white/90 active:bg-black/75",
                action.disabled && "opacity-40"
              )}
              style={{ touchAction: "none" }}
              onPointerDown={(e) => fireAction(action, e)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
