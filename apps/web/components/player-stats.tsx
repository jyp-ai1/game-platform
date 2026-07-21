"use client";

import {
  ACHIEVEMENTS,
  getAchievements,
  getDailyStreak,
  getMostPlayedGameSlug,
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

  const mostPlayedSlug = getMostPlayedGameSlug();
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
