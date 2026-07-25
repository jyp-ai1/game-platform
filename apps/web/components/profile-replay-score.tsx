"use client";

import {
  ACHIEVEMENTS,
  getAchievements,
  getDailyStreak,
  getServerAchievementsSnapshot,
  getServerDailyStreakSnapshot,
  getServerTotalPlayCountSnapshot,
  getTotalPlayCount,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import { useMemo, useSyncExternalStore } from "react";

import {
  filterPlayHistory,
  getPlayHistorySnapshot,
  getServerPlayHistorySnapshot,
  formatDuration,
  subscribePlayHistory,
} from "@/lib/play-history";
import {
  getFavoritesSnapshot,
  getServerFavoritesSnapshot,
  subscribeFavorites,
} from "@/lib/local-storage";
import { computeReplayScore, replayScoreTier } from "@/lib/replay-score";

export function ProfileReplayScore() {
  const totalPlays = useSyncExternalStore(
    subscribeEngagement,
    getTotalPlayCount,
    getServerTotalPlayCountSnapshot
  );
  const streak = useSyncExternalStore(
    subscribeEngagement,
    getDailyStreak,
    getServerDailyStreakSnapshot
  );
  const achievements = useSyncExternalStore(
    subscribeEngagement,
    getAchievements,
    getServerAchievementsSnapshot
  );
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );
  const history = useSyncExternalStore(
    subscribePlayHistory,
    getPlayHistorySnapshot,
    getServerPlayHistorySnapshot
  );

  const yearSec = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    return history
      .filter((e) => new Date(e.startedAt) >= yearStart)
      .reduce((s, e) => s + e.durationSec, 0);
  }, [history]);

  const monthSec = filterPlayHistory(history, "month").reduce(
    (s, e) => s + e.durationSec,
    0
  );

  const score = computeReplayScore({
    totalPlays,
    currentStreak: streak.currentStreak,
    achievementCount: Object.keys(achievements).length,
    totalAchievementCount: Object.keys(ACHIEVEMENTS).length,
    favoriteCount: favorites.length,
    totalTimeSec: history.reduce((s, e) => s + e.durationSec, 0),
  });

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 backdrop-blur">
        <p className="text-xs text-muted-foreground">Replay Score</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-primary">{score}</p>
        <p className="text-sm font-medium">{replayScoreTier(score)}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
        <p className="text-xs text-muted-foreground">이번 달</p>
        <p className="mt-1 text-xl font-semibold">{formatDuration(monthSec)}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
        <p className="text-xs text-muted-foreground">올해</p>
        <p className="mt-1 text-xl font-semibold">{formatDuration(yearSec)}</p>
      </div>
    </div>
  );
}
