/**
 * Memory Engine — your history as asset (Replay OS v4).
 */
import type { Game } from "@game-platform/shared";

import { filterPlayHistory, getPlayHistorySnapshot } from "@/lib/play-history";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import { buildReplayIdentityProfile } from "@/lib/replay-identity";

export interface MemoryFlash {
  id: string;
  headline: string;
  detail: string;
  emoji: string;
  href: string;
}

export function getMemoryFlashes(games: Game[], limit = 3): MemoryFlash[] {
  if (typeof window === "undefined") return [];

  const history = getPlayHistorySnapshot();
  const wrapped = buildWrappedSnapshot(games);
  const identity = buildReplayIdentityProfile(games);
  const flashes: MemoryFlash[] = [];

  const weekPlays = filterPlayHistory(history, "week").length;
  const monthPlays = filterPlayHistory(history, "month").length;
  if (monthPlays > weekPlays && monthPlays > 0) {
    flashes.push({
      id: "month-growth",
      headline: "이번 달 성장",
      detail: `${monthPlays}판 플레이 · Replay Score ${wrapped.replayScore}`,
      emoji: "📈",
      href: "/journey",
    });
  }

  if (identity.topGameTitle) {
    flashes.push({
      id: "top-game-year",
      headline: "올해 대표 게임",
      detail: identity.topGameTitle,
      emoji: "⭐",
      href: identity.topGameSlug ? `/games/${identity.topGameSlug}` : "/library",
    });
  }

  if (wrapped.streakDays >= 7) {
    flashes.push({
      id: "streak-memory",
      headline: `${wrapped.streakDays}일 연속 Replay`,
      detail: "습관이 기록이 되었습니다",
      emoji: "🔥",
      href: "/missions",
    });
  }

  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const oldEntries = history.filter((e) => new Date(e.startedAt) <= monthAgo);
  if (oldEntries.length > 0) {
    flashes.push({
      id: "month-ago",
      headline: "한 달 전 오늘",
      detail: `${oldEntries[0]!.slug} 플레이했었어요`,
      emoji: "🕐",
      href: "/journey",
    });
  }

  return flashes.slice(0, limit);
}

export function getPrimaryMemoryFlash(games: Game[]): MemoryFlash | null {
  return getMemoryFlashes(games, 1)[0] ?? null;
}
