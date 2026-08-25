"use client";

import { cn } from "@game-platform/ui";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  enterViewportFullscreen,
  exitViewportFullscreen,
  getActiveFullscreenElement,
  isViewportFullscreen,
} from "./multiplayer-fullscreen";

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
}: {
  children: ReactNode;
  /** Rankings / LIVE info — outside playfield (not overlaying top-right). */
  sideHud?: ReactNode;
  topBar?: ReactNode;
  onExit?: () => void;
  className?: string;
  boardClassName?: string;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
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
            onClick={onExit}
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
          "flex w-full max-w-xl items-start gap-2",
          isGameFullscreen && "max-w-none flex-1 items-center justify-center"
        )}
      >
        <div
          className={cn(
            "relative aspect-square min-w-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-black",
            isGameFullscreen && "max-h-[min(100dvh,100dvw)] max-w-[min(100dvh,100dvw)]",
            boardClassName
          )}
        >
          {children}
        </div>
        {sideHud ? (
          <aside className="hidden w-36 shrink-0 sm:block">{sideHud}</aside>
        ) : null}
      </div>
      {sideHud ? <div className="w-full max-w-xl sm:hidden">{sideHud}</div> : null}
    </div>
  );
}

/** Compact ranking card for side HUD (outside playfield). */
export function MultiplayerSideRankHud({
  title = "TOP",
  entries,
  selfId,
}: {
  title?: string;
  entries: Array<{ id: string; label: string; value: string | number }>;
  selfId?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/55 p-2 text-[11px] backdrop-blur">
      <p className="mb-1 font-semibold text-amber-200">{title}</p>
      <ol className="space-y-0.5">
        {entries.map((r, i) => (
          <li key={r.id} className="flex justify-between gap-1">
            <span className={r.id === selfId ? "text-cyan-300" : "text-white/80"}>
              {i + 1}. {r.label}
            </span>
            <span className="font-mono text-white/60">{r.value}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
