"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { JourneyHeatMap } from "@/components/journey-heat-map";
import { formatPlayTime, getTimeAnalytics } from "@/lib/library-analytics";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { replayCard } from "@/lib/replay-os";

export function LibraryAnalyticsPanel({ games }: { games: Game[] }) {
  const tick = useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const stats = useMemo(() => getTimeAnalytics(games), [games, tick]);

  const periods = [
    { label: "Today", plays: stats.todayPlays, time: formatPlayTime(stats.todayMinutes) },
    { label: "This Week", plays: stats.weekPlays, time: formatPlayTime(stats.weekMinutes) },
    { label: "This Month", plays: stats.monthPlays, time: formatPlayTime(stats.monthMinutes) },
    { label: "This Year", plays: stats.yearPlays, time: formatPlayTime(stats.yearMinutes) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {periods.map((p) => (
          <div key={p.label} className={replayCard("p-4")}>
            <p className="replay-label">{p.label}</p>
            <p className="replay-stat mt-1">{p.plays}</p>
            <p className="text-xs text-muted-foreground">sessions · {p.time}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={replayCard("p-4")}>
          <p className="replay-label">Replay Score</p>
          <p className="replay-stat mt-1">{stats.replayScore}</p>
        </div>
        <div className={replayCard("p-4")}>
          <p className="replay-label">Top Genre</p>
          <p className="mt-1 text-lg font-bold">{stats.topGenre}</p>
        </div>
        <div className={replayCard("p-4")}>
          <p className="replay-label">Favorites</p>
          <p className="replay-stat mt-1">{stats.favoriteCount}</p>
        </div>
      </div>

      <JourneyHeatMap />

      <div className="flex flex-wrap gap-3">
        <Link href="/wrapped" className={replayCard("px-5 py-3 text-sm font-medium text-primary")}>
          Open Replay Wrapped →
        </Link>
        <Link href="/profile" className={replayCard("px-5 py-3 text-sm font-medium")}>
          Profile →
        </Link>
      </div>
    </div>
  );
}
