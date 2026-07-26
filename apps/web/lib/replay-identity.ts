/**
 * Replay Identity — emotional gamer profile (Product OS v3).
 */
import {
  getDailyStreak,
  getGamePlayCounts,
  getLevelProgress,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";

import { filterPlayHistory, getPlayHistorySnapshot } from "@/lib/play-history";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import { getOverallCollectionPercent } from "@/lib/collection-engine";
import { getAttendanceStreak } from "@/lib/shop-store";
import { replayScoreTier } from "@/lib/replay-score";

export interface ReplayIdentityProfile {
  title: string;
  titleKo: string;
  topGenre: string;
  topGenrePlays: number;
  yearHours: number;
  weekHours: number;
  todayMinutes: number;
  replayScore: number;
  replayTier: string;
  level: number;
  streakDays: number;
  playStyle: string;
  topGameSlug: string | null;
  topGameTitle: string | null;
}

export interface FullReplayIdentity extends ReplayIdentityProfile {
  displayName: string;
  badgeLabels: string[];
  badgeLabelsKo: string[];
  seasonTier: string;
  seasonTierKo: string;
  topPercent: number | null;
  collectionPercent: number;
  isCollector: boolean;
  isExplorer: boolean;
}

const GENRE_TITLES: Record<string, { en: string; ko: string }> = {
  puzzle: { en: "Puzzle Master", ko: "퍼즐 마스터" },
  arcade: { en: "Arcade Ace", ko: "아케이드 에이스" },
  board: { en: "Board Strategist", ko: "보드 전략가" },
  sports: { en: "Sports Champion", ko: "스포츠 챔피언" },
  casual: { en: "Casual Explorer", ko: "캐주얼 탐험가" },
  brain: { en: "Brain Trainer", ko: "두뇌 트레이너" },
};

function normalizeGenre(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("퍼즐") || lower === "puzzle") return "puzzle";
  if (lower.includes("arcade") || lower.includes("아케이드")) return "arcade";
  if (lower.includes("board") || lower.includes("보드")) return "board";
  if (lower.includes("sport") || lower.includes("스포츠")) return "sports";
  if (lower.includes("brain") || lower.includes("두뇌")) return "brain";
  return "casual";
}

export function buildReplayIdentityProfile(games: Game[]): ReplayIdentityProfile {
  const wrapped = buildWrappedSnapshot(games);
  const counts = getGamePlayCounts();
  const streak = getDailyStreak();
  const level = getLevelProgress();
  const history = getPlayHistorySnapshot();
  const bySlug = new Map(games.map((g) => [g.slug, g]));

  const genreCounts = new Map<string, number>();
  for (const [slug, n] of Object.entries(counts)) {
    const game = bySlug.get(slug);
    const genre = normalizeGenre(game?.category?.slug ?? game?.category?.name ?? "casual");
    genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + n);
  }

  const topGenreEntry = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topGenre = topGenreEntry?.[0] ?? "casual";
  const topGenrePlays = topGenreEntry?.[1] ?? wrapped.totalPlays;
  const titles = GENRE_TITLES[topGenre] ?? GENRE_TITLES.casual;

  const todayMin = Math.round(
    filterPlayHistory(history, "today").reduce((s, e) => s + e.durationSec, 0) / 60
  );
  const weekMin = Math.round(
    filterPlayHistory(history, "week").reduce((s, e) => s + e.durationSec, 0) / 60
  );
  const yearMin = Math.round(
    filterPlayHistory(history, "all").reduce((s, e) => s + e.durationSec, 0) / 60
  );

  const topSlug = wrapped.topGames[0]?.slug ?? null;
  const topGame = topSlug ? bySlug.get(topSlug) : null;

  return {
    title: titles.en,
    titleKo: titles.ko,
    topGenre: wrapped.favoriteGenre,
    topGenrePlays,
    yearHours: Math.round(yearMin / 60),
    weekHours: Math.round((weekMin / 60) * 10) / 10,
    todayMinutes: todayMin,
    replayScore: wrapped.replayScore,
    replayTier: replayScoreTier(wrapped.replayScore),
    level: level.level,
    streakDays: streak.currentStreak,
    playStyle: wrapped.playStyle,
    topGameSlug: topSlug,
    topGameTitle: topGame?.title ?? topSlug,
  };
}

function seasonTierFromStreak(streak: number): { en: string; ko: string } {
  if (streak >= 30) return { en: "Season Platinum", ko: "Season Platinum" };
  if (streak >= 14) return { en: "Season Gold", ko: "Season Gold" };
  if (streak >= 7) return { en: "Season Silver", ko: "Season Silver" };
  return { en: "Season Bronze", ko: "Season Bronze" };
}

function estimateTopPercent(replayScore: number): number | null {
  if (replayScore <= 0) return null;
  if (replayScore >= 2000) return 1;
  if (replayScore >= 1200) return 3;
  if (replayScore >= 800) return 10;
  if (replayScore >= 400) return 25;
  return 50;
}

/** Full identity with badges — profile first screen (Replay OS v4). */
export function buildFullReplayIdentity(games: Game[], displayName = "Player"): FullReplayIdentity {
  const base = buildReplayIdentityProfile(games);
  const collectionPercent = getOverallCollectionPercent(games);
  const uniqueGames = Object.keys(getGamePlayCounts()).length;
  const seasonStreak = getAttendanceStreak();
  const season = seasonTierFromStreak(Math.max(base.streakDays, seasonStreak));
  const topPercent = estimateTopPercent(base.replayScore);

  const isCollector = collectionPercent >= 40;
  const isExplorer = uniqueGames >= 8;

  const badgeLabels: string[] = [];
  const badgeLabelsKo: string[] = [];

  badgeLabels.push(base.title);
  badgeLabelsKo.push(base.titleKo);

  if (isCollector) {
    badgeLabels.push("Collector");
    badgeLabelsKo.push("Collector");
  }
  if (isExplorer) {
    badgeLabels.push("Explorer");
    badgeLabelsKo.push("Explorer");
  }
  if (topPercent !== null && topPercent <= 10) {
    badgeLabels.push(`Top ${topPercent}%`);
    badgeLabelsKo.push(`Top ${topPercent}%`);
  }
  badgeLabels.push(season.en);
  badgeLabelsKo.push(season.ko);

  if (base.streakDays >= 3) {
    badgeLabelsKo.push(`${base.streakDays}일 Streak`);
  }

  return {
    ...base,
    displayName,
    badgeLabels,
    badgeLabelsKo,
    seasonTier: season.en,
    seasonTierKo: season.ko,
    topPercent,
    collectionPercent,
    isCollector,
    isExplorer,
  };
}

/** Mock friend score for "beat friend" motivation on game end. */
export function getFriendBeatGap(slug: string, yourScore: number): {
  nickname: string;
  friendScore: number;
  gap: number;
} {
  const seed = slug.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const friendScore = 800 + (seed % 400) + Math.floor(yourScore * 0.85);
  return {
    nickname: "철수",
    friendScore,
    gap: friendScore - yourScore,
  };
}
