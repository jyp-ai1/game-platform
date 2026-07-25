"use client";

import type { Game } from "@game-platform/shared";
import { useMemo, useSyncExternalStore } from "react";

import {
  computeJourneyStats,
  filterPlayHistory,
  getPlayHistorySnapshot,
  getServerPlayHistorySnapshot,
  subscribePlayHistory,
  type PlayHistoryPeriod,
} from "@/lib/play-history";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function JourneyStatsPanel({
  games,
  period = "all",
}: {
  games: Game[];
  period?: PlayHistoryPeriod;
}) {
  const history = useSyncExternalStore(
    subscribePlayHistory,
    getPlayHistorySnapshot,
    getServerPlayHistorySnapshot
  );

  const stats = useMemo(() => {
    const filtered = filterPlayHistory(history, period);
    return computeJourneyStats(filtered, games);
  }, [history, games, period]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="총 플레이" value={`${stats.totalPlays}회`} />
      <StatCard label="총 시간 (추정)" value={stats.totalTimeLabel} />
      <StatCard label="연속 플레이" value={`${stats.currentStreak}일`} />
      <StatCard
        label="가장 많이 한 게임"
        value={stats.mostPlayedTitle ?? "—"}
      />
      <StatCard
        label="최근 게임"
        value={
          stats.recentSlugs.length > 0
            ? `${stats.recentSlugs.length}종`
            : "—"
        }
      />
    </div>
  );
}
