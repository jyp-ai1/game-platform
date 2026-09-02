"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

import type { SnakeBestRecord, SnakeMissionProgress } from "./snake-retention";

export function SnakeGameOver({
  finalScore,
  finalLength,
  bestCombo,
  missions,
  bestRecord,
  onRetry,
  onPlayAnother,
}: {
  finalScore: number;
  finalLength: number;
  bestCombo: number;
  missions: SnakeMissionProgress[];
  bestRecord: SnakeBestRecord;
  onRetry: () => void;
  onPlayAnother: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;

  const beatScore = finalScore >= bestRecord.bestScore && bestRecord.bestScore > 0;
  const beatLength = finalLength >= bestRecord.bestLength && bestRecord.bestLength > 0;
  const beatCombo = bestCombo >= bestRecord.bestCombo && bestRecord.bestCombo > 0;

  return createPortal(
    <div
      data-testid="snake-game-over"
      className="pointer-events-none fixed inset-0 z-[200] flex items-end justify-center bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4 pb-8 sm:items-center sm:bg-black/45"
      role="presentation"
    >
      <div
        className="pointer-events-auto flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/15 bg-black/85 px-5 py-5 text-left shadow-xl backdrop-blur-md"
        role="dialog"
        aria-label="Game Over"
      >
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
          Game Over
        </p>

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
            <p className="text-[10px] uppercase text-white/45">Max Length</p>
            <p className="font-bold tabular-nums text-white">L:{finalLength}</p>
            {beatLength ? <p className="text-[9px] text-cyan-300">NEW BEST</p> : null}
          </div>
          <div className="rounded-lg bg-white/5 px-2 py-2">
            <p className="text-[10px] uppercase text-white/45">Best Combo</p>
            <p className="font-bold tabular-nums text-white">x{bestCombo}</p>
            {beatCombo ? <p className="text-[9px] text-cyan-300">NEW BEST</p> : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">Missions</p>
          {missions.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between text-xs text-white/80"
              data-testid={`snake-mission-${m.id}`}
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
            className="h-11 w-full rounded-xl bg-white text-sm font-semibold text-black hover:bg-white/90"
            onClick={onRetry}
          >
            RETRY
          </button>
          <button
            type="button"
            data-testid="mp-death-play-another"
            className="h-11 w-full rounded-xl border border-white/25 bg-white/5 text-sm font-medium text-white hover:bg-white/10"
            onClick={onPlayAnother}
          >
            PLAY ANOTHER GAME
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
