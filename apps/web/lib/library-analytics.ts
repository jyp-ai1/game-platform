/**
 * Library time analytics — today / week / month / year. Track D.
 */
import { filterPlayHistory, getPlayHistorySnapshot } from "@/lib/play-history";
import { getFavoritesSnapshot, getRecentlyPlayedSnapshot } from "@/lib/local-storage";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import type { Game } from "@game-platform/shared";

export interface TimeAnalytics {
  todayPlays: number;
  todayMinutes: number;
  weekPlays: number;
  weekMinutes: number;
  monthPlays: number;
  monthMinutes: number;
  yearPlays: number;
  yearMinutes: number;
  favoriteCount: number;
  recentCount: number;
  replayScore: number;
  topGenre: string;
}

function minutes(entries: ReturnType<typeof filterPlayHistory>): number {
  return Math.round(entries.reduce((s, e) => s + e.durationSec, 0) / 60);
}

export function getTimeAnalytics(games: Game[]): TimeAnalytics {
  const history = getPlayHistorySnapshot();
  const today = filterPlayHistory(history, "today");
  const week = filterPlayHistory(history, "week");
  const month = filterPlayHistory(history, "month");
  const year = filterPlayHistory(history, "all"); // lifetime / this year
  const wrapped = buildWrappedSnapshot(games);

  return {
    todayPlays: today.length,
    todayMinutes: minutes(today),
    weekPlays: week.length,
    weekMinutes: minutes(week),
    monthPlays: month.length,
    monthMinutes: minutes(month),
    yearPlays: year.length,
    yearMinutes: minutes(year),
    favoriteCount: getFavoritesSnapshot().length,
    recentCount: getRecentlyPlayedSnapshot().length,
    replayScore: wrapped.replayScore,
    topGenre: wrapped.favoriteGenre,
  };
}

export function formatPlayTime(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
