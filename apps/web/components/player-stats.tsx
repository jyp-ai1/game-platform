"use client";

import {
  ACHIEVEMENTS,
  getAchievements,
  getDailyStreak,
  getGamePlayCounts,
  getServerAchievementsSnapshot,
  getServerDailyStreakSnapshot,
  getServerTodayPlayCountSnapshot,
  getServerTotalPlayCountSnapshot,
  getServerXPSnapshot,
  getTodayPlayCount,
  getTotalPlayCount,
  getXP,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { useSyncExternalStore } from "react";

import {
  getFavoritesSnapshot,
  getServerFavoritesSnapshot,
  subscribeFavorites,
} from "@/lib/local-storage";

const EMPTY_PLAY_COUNTS: Record<string, number> = {};
function getServerGamePlayCountsSnapshot(): Record<string, number> {
  return EMPTY_PLAY_COUNTS;
}

function topPlayedSlug(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return null;
  }
  return entries.reduce((max, entry) => (entry[1] > max[1] ? entry : max))[0];
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function PlayerStats({ games }: { games: Game[] }) {
  const totalPlayCount = useSyncExternalStore(
    subscribeEngagement,
    getTotalPlayCount,
    getServerTotalPlayCountSnapshot
  );
  const todayPlayCount = useSyncExternalStore(
    subscribeEngagement,
    getTodayPlayCount,
    getServerTodayPlayCountSnapshot
  );
  const dailyStreak = useSyncExternalStore(
    subscribeEngagement,
    getDailyStreak,
    getServerDailyStreakSnapshot
  );
  const xp = useSyncExternalStore(
    subscribeEngagement,
    getXP,
    getServerXPSnapshot
  );
  const achievementsState = useSyncExternalStore(
    subscribeEngagement,
    getAchievements,
    getServerAchievementsSnapshot
  );
  const favoriteSlugs = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );
  const gamePlayCounts = useSyncExternalStore(
    subscribeEngagement,
    getGamePlayCounts,
    getServerGamePlayCountsSnapshot
  );

  const mostPlayedSlug = topPlayedSlug(gamePlayCounts);
  const mostPlayedTitle = mostPlayedSlug
    ? (games.find((game) => game.slug === mostPlayedSlug)?.title ?? "-")
    : "-";
  const totalAchievements = Object.keys(ACHIEVEMENTS).length;
  const unlockedCount = Object.keys(achievementsState).length;
  const achievementRate =
    totalAchievements === 0 ? 0 : unlockedCount / totalAchievements;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatItem label="총 플레이" value={`${totalPlayCount}회`} />
      <StatItem label="오늘 플레이" value={`${todayPlayCount}회`} />
      <StatItem label="연속 출석" value={`${dailyStreak.currentStreak}일`} />
      <StatItem label="총 XP" value={`${xp.toLocaleString()} XP`} />
      <StatItem
        label="획득 업적"
        value={`${unlockedCount}/${totalAchievements}개 (${Math.round(achievementRate * 100)}%)`}
      />
      <StatItem label="즐겨찾기" value={`${favoriteSlugs.length}개`} />
      <StatItem label="가장 많이 한 게임" value={mostPlayedTitle} />
    </div>
  );
}
