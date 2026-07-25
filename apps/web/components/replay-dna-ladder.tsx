"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { formatPlayTime } from "@/lib/library-analytics";
import {
  filterPlayHistory,
  getPlayHistorySnapshot,
  getServerPlayHistorySnapshot,
  subscribePlayHistory,
} from "@/lib/play-history";
import {
  getLevelProgress,
  getServerLevelProgressSnapshot,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import { replayScoreTier } from "@/lib/replay-score";
import { useMounted } from "@/lib/use-mounted";

/** Replay DNA ladder — the platform's core asset visualization. */
export function ReplayDnaLadder({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const history = useSyncExternalStore(
    subscribePlayHistory,
    getPlayHistorySnapshot,
    getServerPlayHistorySnapshot
  );
  const level = useSyncExternalStore(
    subscribeEngagement,
    getLevelProgress,
    getServerLevelProgressSnapshot
  );

  const ladder = useMemo(() => {
    if (!mounted) return null;
    const today = filterPlayHistory(history, "today");
    const week = filterPlayHistory(history, "week");
    const year = filterPlayHistory(history, "all");
    const todayMin = Math.round(today.reduce((s, e) => s + e.durationSec, 0) / 60);
    const weekMin = Math.round(week.reduce((s, e) => s + e.durationSec, 0) / 60);
    const yearMin = Math.round(year.reduce((s, e) => s + e.durationSec, 0) / 60);
    const wrapped = buildWrappedSnapshot(games);
    return {
      todayMin,
      weekMin,
      yearMin,
      replayScore: wrapped.replayScore,
      playStyle: wrapped.playStyle,
      tier: replayScoreTier(wrapped.replayScore),
      level: level.level,
    };
  }, [history, games, mounted, level]);

  if (!mounted || !ladder) return null;

  const steps = [
    { label: "Today", value: formatPlayTime(ladder.todayMin) },
    { label: "This Week", value: formatPlayTime(ladder.weekMin) },
    { label: "All Time", value: formatPlayTime(ladder.yearMin) },
    { label: "Replay Score", value: String(ladder.replayScore) },
    { label: `Lv.${ladder.level}`, value: ladder.tier },
    { label: "Identity", value: ladder.playStyle },
  ];

  return (
    <section className="border-y border-primary/10 bg-gradient-to-r from-card/80 via-primary/5 to-card/80 py-4">
      <Container>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Replay DNA</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your play data — games fade, this stays
            </p>
          </div>
          <Link href="/wrapped" className="text-sm text-primary hover:underline">
            Open Wrapped →
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="rounded-xl border border-white/10 bg-card/60 px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-sm font-bold">{s.value}</p>
              </div>
              {i < steps.length - 1 ? (
                <span className="text-muted-foreground" aria-hidden>
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
