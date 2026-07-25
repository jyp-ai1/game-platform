/**
 * Wrapped-style identity data structure — pre-built for year-end reports.
 */
import {
  getAchievements,
  getDailyStreak,
  getGamePlayCounts,
  getTotalPlayCount,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";

import { getFavoritesSnapshot } from "@/lib/local-storage";
import { filterPlayHistory, getPlayHistorySnapshot } from "@/lib/play-history";
import { computeReplayScore } from "@/lib/replay-score";

export interface WrappedSnapshot {
  generatedAt: string;
  totalPlays: number;
  streakDays: number;
  replayScore: number;
  favoriteGenre: string;
  playStyle: string;
  topGames: { slug: string; plays: number }[];
  monthlyMinutes: number;
  weeklyPlays: number;
}

export function buildWrappedSnapshot(games: Game[]): WrappedSnapshot {
  const history = getPlayHistorySnapshot();
  const counts = getGamePlayCounts();
  const streak = getDailyStreak();
  const totalPlays = getTotalPlayCount();
  const favorites = getFavoritesSnapshot();
  const achievements = getAchievements();

  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const genreCounts = new Map<string, number>();

  for (const [slug, n] of Object.entries(counts)) {
    const game = bySlug.get(slug);
    const genre = game?.category?.name ?? game?.category?.slug ?? "기타";
    genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + n);
  }

  const favoriteGenre =
    [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Arcade";

  const topGames = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slug, plays]) => ({ slug, plays }));

  const weekly = filterPlayHistory(history, "week");
  const monthly = filterPlayHistory(history, "month");
  const monthlyMinutes = Math.round(
    monthly.reduce((sum, e) => sum + e.durationSec, 0) / 60
  );
  const totalTimeSec = history.reduce((sum, e) => sum + e.durationSec, 0);

  const achievementCount = Object.keys(achievements).length;
  const playStyle =
    favoriteGenre.includes("퍼즐") || favoriteGenre === "puzzle"
      ? "퍼즐 탐험가"
      : favorites.length >= 5
        ? "수집가"
        : streak.currentStreak >= 3
          ? "데일리 플레이어"
          : "캐주얼 탐험가";

  const replayScore = computeReplayScore({
    totalPlays,
    currentStreak: streak.currentStreak,
    achievementCount,
    totalAchievementCount: 6,
    favoriteCount: favorites.length,
    totalTimeSec,
  });

  return {
    generatedAt: new Date().toISOString(),
    totalPlays,
    streakDays: streak.currentStreak,
    replayScore,
    favoriteGenre,
    playStyle,
    topGames,
    monthlyMinutes,
    weeklyPlays: weekly.length,
  };
}
