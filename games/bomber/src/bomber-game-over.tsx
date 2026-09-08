"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

import type { BomberBestRecord, BomberMissionProgress } from "./bomber-retention";

export function BomberGameOver({
  finalScore,
  blocksDestroyed,
  enemiesDefeated,
  bestChain,
  missions,
  bestRecord,
  onRetry,
  onPlayAnother,
  onExit,
  title = "RESULT",
  place,
}: {
  finalScore: number;
  blocksDestroyed: number;
  enemiesDefeated: number;
  bestChain: number;
  missions: BomberMissionProgress[];
  bestRecord: BomberBestRecord;
  onRetry: () => void;
  onPlayAnother: () => void;
  onExit: () => void;
  title?: string;
  place?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState<"retry" | "another" | "exit" | null>(null);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;

  function runOnce(kind: "retry" | "another" | "exit", fn: () => void) {
    if (busy) return;
    setBusy(kind);
    fn();
    if (kind === "retry") window.setTimeout(() => setBusy(null), 900);
  }

  const beatScore = finalScore >= bestRecord.bestScore && bestRecord.bestScore > 0;
  const beatChain = bestChain >= bestRecord.bestChain && bestRecord.bestChain > 0;
  const beatBlocks = blocksDestroyed >= bestRecord.blocksDestroyed && bestRecord.blocksDestroyed > 0;
  const beatEnemies =
    enemiesDefeated >= bestRecord.enemiesDefeated && bestRecord.enemiesDefeated > 0;

  return createPortal(
    <div
      data-testid="bomber-game-over"
      className="pointer-events-none fixed inset-0 z-[200] flex items-end justify-center bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4 pb-8 sm:items-center sm:bg-black/45"
      role="presentation"
    >
      <div
        className="pointer-events-auto flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/15 bg-black/85 px-5 py-5 text-left shadow-xl backdrop-blur-md"
        role="dialog"
        aria-label={title}
      >
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
          RESULT
        </p>
        <p data-testid="mp-death-outcome" className="text-center text-lg font-bold text-white">
          {title}
        </p>
        {place != null ? (
          <p className="text-center text-xs text-white/55">Place #{place}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          <div className="rounded-lg bg-white/5 px-2 py-2">
            <p className="text-[10px] uppercase text-white/45">Score</p>
            <p className="font-bold tabular-nums text-white">{finalScore.toLocaleString()}</p>
            {beatScore ? <p className="text-[9px] text-cyan-300">NEW BEST</p> : null}
          </div>
          <div className="rounded-lg bg-white/5 px-2 py-2">
            <p className="text-[10px] uppercase text-white/45">Best Score</p>
            <p className="font-bold tabular-nums text-white/80">
              {Math.max(bestRecord.bestScore, finalScore).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-white/5 px-2 py-2">
            <p className="text-[10px] uppercase text-white/45">Blocks</p>
            <p className="font-bold tabular-nums text-white">{blocksDestroyed}</p>
            {beatBlocks ? <p className="text-[9px] text-cyan-300">NEW BEST</p> : null}
          </div>
          <div className="rounded-lg bg-white/5 px-2 py-2">
            <p className="text-[10px] uppercase text-white/45">Enemies</p>
            <p className="font-bold tabular-nums text-white">{enemiesDefeated}</p>
            {beatEnemies ? <p className="text-[9px] text-cyan-300">NEW BEST</p> : null}
          </div>
          <div className="col-span-2 rounded-lg bg-white/5 px-2 py-2">
            <p className="text-[10px] uppercase text-white/45">Best Chain</p>
            <p className="font-bold tabular-nums text-white">x{bestChain}</p>
            {beatChain ? <p className="text-[9px] text-cyan-300">NEW BEST</p> : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">Missions</p>
          {missions.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between text-xs text-white/80"
              data-testid={`bomber-mission-${m.id}`}
            >
              <span>
                {m.done ? "✓" : "○"} {m.emoji} {m.label}
              </span>
              <span className="tabular-nums text-white/50">
                {Math.min(m.current, m.target)}/{m.target}
              </span>
            </div>
          ))}
        </div>

        <div className="flex w-full flex-col gap-2 pt-1">
          <button
            type="button"
            data-testid="mp-death-retry"
            disabled={busy !== null}
            className="h-11 w-full rounded-xl bg-white text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
            onClick={() => runOnce("retry", onRetry)}
          >
            {busy === "retry" ? "REMATCHING…" : "REMATCH"}
          </button>
          <button
            type="button"
            data-testid="mp-death-play-another"
            disabled={busy !== null}
            className="h-11 w-full rounded-xl border border-white/25 bg-white/5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60"
            onClick={() => runOnce("another", onPlayAnother)}
          >
            ANOTHER GAME
          </button>
          <button
            type="button"
            data-testid="mp-death-exit"
            disabled={busy !== null}
            className="h-11 w-full rounded-xl border border-white/25 bg-white/5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60"
            onClick={() => runOnce("exit", onExit)}
          >
            EXIT
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
