"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

import type { AgarBestRecord, AgarMissionProgress } from "./agar-retention";
import { formatAgarMass } from "./agar-format";

export type AgarMoreGame = {
  slug: string;
  title: string;
  playHref: string;
};

export function AgarGameOver({
  finalRank,
  finalMass,
  bestCombo,
  missions,
  bestRecord,
  onRetry,
  onPlayAnother,
  otherGames = [],
}: {
  finalRank: number;
  finalMass: number;
  bestCombo: number;
  missions: AgarMissionProgress[];
  bestRecord: AgarBestRecord;
  onRetry: () => void;
  onPlayAnother: () => void;
  otherGames?: AgarMoreGame[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;

  const beatMass = finalMass >= bestRecord.bestMass && bestRecord.bestMass > 0;
  const beatRank = finalRank <= bestRecord.bestRank && bestRecord.bestRank < 99;
  const beatCombo = bestCombo >= bestRecord.bestCombo && bestRecord.bestCombo > 0;

  return createPortal(
    <div
      data-testid="agar-game-over"
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

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-white/5 px-2 py-2">
            <p className="text-[10px] uppercase text-white/45">Rank</p>
            <p className="font-bold tabular-nums text-white">#{finalRank}</p>
            {beatRank ? <p className="text-[9px] text-cyan-300">NEW BEST</p> : null}
          </div>
          <div className="rounded-lg bg-white/5 px-2 py-2">
            <p className="text-[10px] uppercase text-white/45">Mass</p>
            <p className="font-bold tabular-nums text-white">{formatAgarMass(finalMass)}</p>
            {beatMass ? <p className="text-[9px] text-cyan-300">NEW BEST</p> : null}
          </div>
          <div className="rounded-lg bg-white/5 px-2 py-2">
            <p className="text-[10px] uppercase text-white/45">Combo</p>
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
              data-testid={`agar-mission-${m.id}`}
            >
              <span>
                {m.done ? "✓" : "○"} {m.emoji} {m.label}
              </span>
              <span className="tabular-nums text-white/50">
                {m.id === "top3" ? (m.done ? "1/1" : "0/1") : `${Math.min(m.current, m.target)}/${m.target}`}
              </span>
            </div>
          ))}
        </div>

        {otherGames.length > 0 ? (
          <div className="space-y-2 border-t border-white/10 pt-3" data-testid="agar-more-games">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">More Games</p>
            {otherGames.map((g) => (
              <div key={g.slug} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-white/90">{g.title}</span>
                <a
                  href={g.playHref}
                  data-testid={`agar-more-games-play-${g.slug}`}
                  className="inline-flex min-h-9 items-center rounded-lg bg-cyan-500/20 px-3 text-xs font-bold text-cyan-100 ring-1 ring-cyan-400/40"
                >
                  PLAY
                </a>
              </div>
            ))}
          </div>
        ) : null}

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
