"use client";

import { cn } from "@game-platform/ui";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  enterViewportFullscreen,
  exitViewportFullscreen,
  getActiveFullscreenElement,
  isViewportFullscreen,
} from "./multiplayer-fullscreen";
import { installMpKeyboardPassthrough, isMpBoardInputActive } from "./multiplayer-input-bridge";

/**
 * Common multiplayer outer frame — same aspect container + chrome.
 * Map/world size stays per-game inside children.
 */
export function MultiplayerPlayShell({
  children,
  sideHud,
  topBar,
  onExit,
  className,
  boardClassName,
  /** When true, game keys get focus + scroll prevention (default on). */
  inputActive = true,
}: {
  children: ReactNode;
  /** Rankings / LIVE info — outside playfield (not overlaying top-right). */
  sideHud?: ReactNode;
  topBar?: ReactNode;
  onExit?: () => void;
  className?: string;
  boardClassName?: string;
  inputActive?: boolean;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const isGameFullscreen = isFullscreen || pseudoFullscreen;

  const toggleFullscreen = useCallback(async () => {
    const el = shellRef.current;
    if (!el) return;
    const nativeNow = isViewportFullscreen(el) || !!getActiveFullscreenElement();
    const inFs = nativeNow || pseudoFullscreen;
    if (inFs) {
      await exitViewportFullscreen();
      setPseudoFullscreen(false);
      document.body.style.overflow = "";
      setIsFullscreen(false);
      return;
    }
    const mode = await enterViewportFullscreen(el);
    if (mode === "pseudo") {
      setPseudoFullscreen(true);
      document.body.style.overflow = "hidden";
    }
    setIsFullscreen(mode === "native" || mode === "pseudo");
  }, [pseudoFullscreen]);

  useEffect(() => {
    const syncFs = () => {
      const native =
        isViewportFullscreen(shellRef.current) || !!getActiveFullscreenElement();
      setIsFullscreen(native || pseudoFullscreen);
      if (!native && !pseudoFullscreen) document.body.style.overflow = "";
    };
    document.addEventListener("fullscreenchange", syncFs);
    document.addEventListener("webkitfullscreenchange", syncFs);
    return () => {
      document.removeEventListener("fullscreenchange", syncFs);
      document.removeEventListener("webkitfullscreenchange", syncFs);
      document.body.style.overflow = "";
    };
  }, [pseudoFullscreen]);

  const inputActiveRef = useRef(inputActive);
  inputActiveRef.current = inputActive;
  const boardInputActiveRef = useRef(false);

  const setBoardInputActive = useCallback((next: boolean) => {
    boardInputActiveRef.current = next;
    const el = boardRef.current;
    if (!el) return;
    if (next) {
      el.setAttribute("data-mp-board-input", "active");
    } else {
      el.removeAttribute("data-mp-board-input");
      if (document.activeElement === el) el.blur();
    }
  }, []);

  useEffect(() => {
    return installMpKeyboardPassthrough(() => inputActiveRef.current && isMpBoardInputActive());
  }, []);

  useEffect(() => {
    if (!inputActive) setBoardInputActive(false);
  }, [inputActive, setBoardInputActive]);

  useEffect(() => {
    if (!inputActive) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const el = boardRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setBoardInputActive(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [inputActive, setBoardInputActive]);

  const focusBoard = useCallback(() => {
    if (!inputActiveRef.current) return;
    boardRef.current?.focus({ preventScroll: true });
    setBoardInputActive(true);
  }, [setBoardInputActive]);

  const onBoardBlur = useCallback(() => {
    setBoardInputActive(false);
  }, [setBoardInputActive]);

  const handleExit = useCallback(() => {
    setBoardInputActive(false);
    onExit?.();
  }, [onExit, setBoardInputActive]);

  return (
    <div
      ref={shellRef}
      data-mp-fs-shell
      className={cn(
        "flex w-full flex-col items-center gap-3",
        isGameFullscreen && "fixed inset-0 z-50 bg-black p-3",
        className
      )}
    >
      {topBar}

      <div className="flex w-full max-w-xl items-center justify-between gap-2">
        {onExit ? (
          <button
            type="button"
            onClick={handleExit}
            className="rounded-lg border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/90"
          >
            나가기
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          data-testid="mp-fullscreen-toggle"
          onClick={() => void toggleFullscreen()}
          className="rounded-lg border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/90"
          aria-label={isGameFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isGameFullscreen ? "전체화면 종료" : "전체화면"}
        </button>
      </div>

      <div
        className={cn(
          "flex w-full max-w-2xl flex-col items-stretch gap-2 sm:flex-row sm:items-start",
          isGameFullscreen && "max-w-none flex-1 items-center justify-center"
        )}
      >
        <div
          ref={boardRef}
          data-mp-play-board
          tabIndex={0}
          role="application"
          aria-label="Game board"
          onPointerDown={focusBoard}
          onFocus={focusBoard}
          onBlur={onBoardBlur}
          className={cn(
            "relative aspect-square min-w-0 w-full flex-1 overflow-hidden rounded-xl border border-white/10 bg-black touch-none select-none outline-none focus:outline-none",
            isGameFullscreen && "max-h-[min(100dvh,100dvw)] max-w-[min(100dvh,100dvw)]",
            boardClassName
          )}
          style={{ WebkitUserSelect: "none", userSelect: "none", touchAction: "none" }}
        >
          {children}
        </div>
        {sideHud ? (
          <aside className="w-full shrink-0 sm:w-40">{sideHud}</aside>
        ) : null}
      </div>
    </div>
  );
}

/** Compact ranking card for side HUD (outside playfield). */
export function MultiplayerSideRankHud({
  title = "TOP 10",
  entries,
  selfId,
}: {
  title?: string;
  entries: Array<{ id: string; label: string; value: string | number }>;
  selfId?: string;
}) {
  return (
    <div
      data-testid="mp-top10"
      className="touch-none select-none rounded-lg border border-white/10 bg-black/55 p-2 text-[11px] backdrop-blur"
      style={{ WebkitUserSelect: "none", userSelect: "none", touchAction: "none" }}
    >
      <p className="mb-1 font-semibold text-amber-200">{title}</p>
      <ol className="space-y-0.5">
        {entries.map((r, i) => {
          const isSelf = selfId != null && r.id === selfId;
          return (
            <li key={r.id} className="flex justify-between gap-1">
              <span className={isSelf ? "font-semibold text-emerald-300" : "text-white/80"}>
                {i + 1}. {isSelf ? "★ " : ""}
                {r.label}
              </span>
              <span className="font-mono text-white/60">{r.value}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** In-game chrome: YOU · L:metric · optional RANK. */
export function MultiplayerYouBar({
  metric,
  rank,
  extra,
  className,
}: {
  /** Display metric already formatted, e.g. "L:42" */
  metric: string;
  rank?: number;
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-testid="mp-you-bar"
      className={cn(
        "flex w-full max-w-xl touch-none select-none flex-wrap items-center justify-between gap-2 text-xs font-semibold tracking-wide text-white/90",
        className
      )}
      style={{ WebkitUserSelect: "none", userSelect: "none", touchAction: "none" }}
    >
      <span className="rounded-md bg-black/55 px-2.5 py-1">
        ★ YOU
      </span>
      <span className="rounded-md bg-black/55 px-2.5 py-1 tabular-nums">{metric}</span>
      {rank != null ? (
        <span className="rounded-md bg-black/55 px-2.5 py-1 tabular-nums">
          RANK {rank > 0 ? `#${rank}` : "—"}
        </span>
      ) : null}
      {extra}
    </div>
  );
}

export type MpMinimapDot = {
  id: string;
  /** Normalized 0–1 world position */
  x: number;
  y: number;
  kind: "self" | "leader" | "human" | "bot";
  rank?: number;
  alive?: boolean;
  title?: string;
};

/** Shared minimap — self ★ green, leader yellow, human blue, bot gray. */
export function MultiplayerMinimap({
  dots,
  viewRect,
  compact = false,
}: {
  dots: MpMinimapDot[];
  /** Viewport rectangle in % of world (0–100). */
  viewRect?: { left: number; top: number; width: number; height: number };
  compact?: boolean;
}) {
  const self = dots.find((d) => d.kind === "self");
  const selfAlive = self?.alive !== false;

  return (
    <div
      data-testid="mp-minimap"
      className={
        compact
          ? "w-full max-w-[6rem] shrink-0 touch-none select-none rounded-lg border border-white/15 bg-black/50 p-1.5"
          : "mt-2 w-full shrink-0 touch-none select-none rounded-lg border border-white/15 bg-black/50 p-2"
      }
      style={{ WebkitUserSelect: "none", userSelect: "none", touchAction: "none" }}
    >
      <p
        className={
          compact
            ? "mb-0.5 text-[7px] font-semibold uppercase tracking-wide text-muted-foreground"
            : "mb-1 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground"
        }
      >
        Minimap
      </p>
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black/30">
        {viewRect ? (
          <div
            className="pointer-events-none absolute border border-white/40 bg-white/5"
            style={{
              left: `${viewRect.left}%`,
              top: `${viewRect.top}%`,
              width: `${viewRect.width}%`,
              height: `${viewRect.height}%`,
            }}
          />
        ) : null}
        {dots.map((d) => {
          if (d.kind === "self") return null;
          if (d.alive === false) return null;
          const color =
            d.kind === "leader" ? "#eab308" : d.kind === "bot" ? "#9ca3af" : "#3b82f6";
          const size = d.kind === "leader" ? 6 : 4;
          return (
            <div
              key={d.id}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%` }}
              title={d.title}
            >
              <div
                className="rounded-full"
                style={{
                  width: size,
                  height: size,
                  backgroundColor: color,
                  boxShadow: d.kind === "leader" ? "0 0 4px #eab308" : undefined,
                }}
              />
              {d.rank != null && d.rank <= 10 ? (
                <span
                  className={
                    compact
                      ? "absolute left-1/2 top-full -translate-x-1/2 text-[7px] font-bold leading-none text-white/80"
                      : "absolute left-1/2 top-full -translate-x-1/2 text-[8px] font-bold leading-none text-white/80"
                  }
                >
                  {d.rank}
                </span>
              ) : null}
            </div>
          );
        })}
        {self ? (
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${self.x * 100}%`,
              top: `${self.y * 100}%`,
              opacity: selfAlive ? 1 : 0,
              visibility: selfAlive ? "visible" : "hidden",
              pointerEvents: "none",
            }}
            title="You"
            aria-hidden={!selfAlive}
          >
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] leading-none text-yellow-200">
              ★
            </span>
            <div
              className="rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_10px_#22c55e]"
              style={{ width: compact ? 10 : 12, height: compact ? 10 : 12 }}
            />
            {self.rank != null && self.rank <= 10 ? (
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-bold leading-none text-emerald-200">
                {self.rank}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Death chrome above canvas/HUD — portal + high z-index so Retry/Exit stay clickable.
 * Game logic stays in the caller; shell only owns presentation.
 */
export function MultiplayerDeathOverlay({
  score,
  metric,
  onRetry,
  onExit,
  title = "Death",
}: {
  score: number;
  /** Game-specific line, e.g. "L:128" or "Wins 2" */
  metric?: string;
  onRetry: () => void;
  onExit: () => void;
  title?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-testid="mp-death-overlay"
      data-death-ux="overlay"
      className="pointer-events-none fixed inset-0 z-[200] flex items-end justify-center bg-gradient-to-t from-black/75 via-black/30 to-transparent p-6 pb-10 sm:items-center sm:bg-black/40 sm:via-transparent"
      role="presentation"
    >
      <div
        className="pointer-events-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-white/15 bg-black/80 px-5 py-5 text-center shadow-xl backdrop-blur-md"
        role="dialog"
        aria-label={title}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{title}</p>
        <p className="text-3xl font-bold tabular-nums text-white">{score.toLocaleString()}</p>
        {metric ? <p className="text-sm font-medium text-white/70">{metric}</p> : null}
        <div className="mt-1 flex w-full gap-2">
          <button
            type="button"
            data-testid="mp-death-retry"
            data-death-ux="retry"
            className="h-11 flex-1 rounded-xl bg-white text-sm font-semibold text-black hover:bg-white/90"
            onClick={onRetry}
          >
            RETRY
          </button>
          <button
            type="button"
            data-testid="mp-death-exit"
            data-death-ux="exit"
            className="h-11 flex-1 rounded-xl border border-white/25 bg-white/5 text-sm font-medium text-white hover:bg-white/10"
            onClick={onExit}
          >
            EXIT
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
