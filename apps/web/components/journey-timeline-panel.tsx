"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import {
  filterPlayHistory,
  formatDuration,
  getPlayHistorySnapshot,
  getServerPlayHistorySnapshot,
  subscribePlayHistory,
  type PlayHistoryPeriod,
} from "@/lib/play-history";
import {
  formatPlayTime,
  getPlayHabitAnalysis,
} from "@/lib/library-analytics";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";

const PERIODS: { id: PlayHistoryPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" },
];

export function JourneyTimelinePanel({ games }: { games: Game[] }) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const history = useSyncExternalStore(
    subscribePlayHistory,
    getPlayHistorySnapshot,
    getServerPlayHistorySnapshot
  );

  const wrapped = useMemo(() => buildWrappedSnapshot(games), [games, history]);
  const habits = useMemo(() => getPlayHabitAnalysis(history), [history]);

  return (
    <section className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PERIODS.map((p) => {
          const filtered = filterPlayHistory(history, p.id);
          const minutes = Math.round(filtered.reduce((s, e) => s + e.durationSec, 0) / 60);
          return (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-card/60 p-4">
              <p className="text-xs text-muted-foreground">{p.label}</p>
              <p className="text-xl font-bold tabular-nums">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">{formatDuration(minutes * 60)}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">Favorite Genre</p>
          <p className="mt-1 font-semibold">{wrapped.favoriteGenre}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">Play Style</p>
          <p className="mt-1 font-semibold">{wrapped.playStyle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">Replay Score</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{wrapped.replayScore}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">Longest Session</p>
          <p className="mt-1 font-semibold tabular-nums">
            {habits.longestSession
              ? formatPlayTime(Math.ceil(habits.longestSession.durationSec / 60))
              : "—"}
          </p>
          {habits.longestSession ? (
            <Link
              href={`/games/${habits.longestSession.slug}`}
              className="mt-1 block text-xs text-primary hover:underline"
            >
              {habits.longestSession.slug}
            </Link>
          ) : null}
        </div>
        <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">Avg Session</p>
          <p className="mt-1 font-semibold tabular-nums">{habits.avgSessionMin}m</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">Peak Hour</p>
          <p className="mt-1 font-semibold">{habits.peakHourLabel}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">Play Habit</p>
          <p className="mt-1 text-sm font-semibold">
            {habits.activeDaysThisWeek}d this week · {habits.weekendRatio}% weekend
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold">Wrapped Preview</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {wrapped.totalPlays} plays · {wrapped.streakDays}d streak · Top: {wrapped.topGames[0]?.slug ?? "—"}
        </p>
        <p className="mt-2 text-xs text-primary">Next week prediction: Puzzle 65% · Arcade 25%</p>
        <Link href="/wrapped" className="mt-2 inline-block text-sm text-primary hover:underline">
          Open Replay Wrapped 2026 →
        </Link>
      </div>

      <div>
        <h3 className="font-semibold">Timeline</h3>
        <ul className="mt-3 space-y-2">
          {history.slice(0, 8).map((e) => (
            <li key={e.id} className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm">
              <Link href={`/games/${e.slug}`} className="hover:text-primary">
                {e.slug}
              </Link>
              <span className="text-xs text-muted-foreground">
                {new Date(e.startedAt).toLocaleString()} · {formatDuration(e.durationSec)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
