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

export interface LongestSession {
  slug: string;
  durationSec: number;
  startedAt: string;
}

export interface PlayHabitAnalysis {
  longestSession: LongestSession | null;
  avgSessionMin: number;
  peakHourLabel: string;
  activeDaysThisWeek: number;
  weekendRatio: number;
}


export function getLongestSession(
  history: ReturnType<typeof getPlayHistorySnapshot>
): LongestSession | null {
  if (history.length === 0) return null;
  const best = history.reduce((a, b) => (b.durationSec > a.durationSec ? b : a));
  return { slug: best.slug, durationSec: best.durationSec, startedAt: best.startedAt };
}

export function getPlayHabitAnalysis(
  history: ReturnType<typeof getPlayHistorySnapshot>
): PlayHabitAnalysis {
  const longestSession = getLongestSession(history);
  const avgSessionMin =
    history.length > 0
      ? Math.round(
          history.reduce((s, e) => s + e.durationSec, 0) / history.length / 60
        )
      : 0;

  const hourCounts = new Array(24).fill(0);
  const daySet = new Set<string>();
  let weekend = 0;
  let weekday = 0;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const e of history) {
    const d = new Date(e.startedAt);
    hourCounts[d.getHours()]++;
    const dayKey = e.startedAt.slice(0, 10);
    if (d.getTime() >= weekAgo) daySet.add(dayKey);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) weekend++;
    else weekday++;
  }

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const peakHourLabel =
    history.length > 0 ? `${peakHour}:00–${(peakHour + 1) % 24}:00` : "—";

  const total = weekend + weekday;
  const weekendRatio = total > 0 ? Math.round((weekend / total) * 100) : 0;

  return {
    longestSession,
    avgSessionMin,
    peakHourLabel,
    activeDaysThisWeek: daySet.size,
    weekendRatio,
  };
}
