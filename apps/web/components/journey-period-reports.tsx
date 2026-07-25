"use client";

import { useMemo, useSyncExternalStore } from "react";

import { formatPlayTime, getPlayHabitAnalysis } from "@/lib/library-analytics";
import {
  filterPlayHistory,
  getPlayHistorySnapshot,
  getServerPlayHistorySnapshot,
  subscribePlayHistory,
} from "@/lib/play-history";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import type { Game } from "@game-platform/shared";
import { subscribeLiveData } from "@/lib/live-data-bus";

export function JourneyPeriodReports({ games }: { games: Game[] }) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const history = useSyncExternalStore(
    subscribePlayHistory,
    getPlayHistorySnapshot,
    getServerPlayHistorySnapshot
  );

  const week = useMemo(() => filterPlayHistory(history, "week"), [history]);
  const year = useMemo(() => filterPlayHistory(history, "all"), [history]);
  const habits = useMemo(() => getPlayHabitAnalysis(history), [history]);
  const wrapped = useMemo(() => buildWrappedSnapshot(games), [games, history]);

  const weekMin = Math.round(week.reduce((s, e) => s + e.durationSec, 0) / 60);
  const yearMin = Math.round(year.reduce((s, e) => s + e.durationSec, 0) / 60);
  const topSlug = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of week) counts.set(e.slug, (counts.get(e.slug) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  }, [week]);

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-card/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Weekly Report</p>
        <p className="mt-2 text-3xl font-bold tabular-nums">{week.length}</p>
        <p className="text-sm text-muted-foreground">sessions · {formatPlayTime(weekMin)}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Top game: {topSlug} · Peak {habits.peakHourLabel}
        </p>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Annual Report</p>
        <p className="mt-2 text-3xl font-bold tabular-nums">{year.length}</p>
        <p className="text-sm text-muted-foreground">total plays · {formatPlayTime(yearMin)}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Replay Score {wrapped.replayScore} · {wrapped.playStyle}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-card/60 p-5 sm:col-span-2 lg:col-span-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Play DNA</p>
        <p className="mt-2 font-semibold">{wrapped.favoriteGenre}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {habits.activeDaysThisWeek} active days this week · {habits.weekendRatio}% weekend
        </p>
        {habits.longestSession ? (
          <p className="mt-2 text-xs text-primary">
            Longest: {formatPlayTime(Math.ceil(habits.longestSession.durationSec / 60))} on{" "}
            {habits.longestSession.slug}
          </p>
        ) : null}
      </div>
    </section>
  );
}
