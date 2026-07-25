/**
 * Replay Loop — off-play nudges + passport data (Replay OS).
 */
import {
  getDailyMission,
  getDailyStreak,
  getLevelProgress,
  isDailyChallengeComplete,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";

import { listChallenges } from "@/lib/challenge-scores-store";
import { getOverallCollectionPercent, getGenreCollections } from "@/lib/collection-engine";
import { countGlobalAchievements } from "@/lib/achievement-engine";
import { getCoins } from "@/lib/coins";
import { buildReplayIdentityProfile } from "@/lib/replay-identity";
import { getAttendanceStreak } from "@/lib/shop-store";
import { getCoreKpis } from "@/lib/product-metrics-store";

export interface OffPlayNudge {
  id: string;
  message: string;
  action: string;
  href: string;
  priority: number;
}

export interface ReplayPassport {
  level: number;
  title: string;
  titleKo: string;
  replayScore: number;
  coins: number;
  collectionPercent: number;
  achievementCount: number;
  streakDays: number;
  genreCollections: ReturnType<typeof getGenreCollections>;
  pendingChallenges: number;
  missionsLeft: number;
  seasonLevel: number;
}

function attendedToday(): boolean {
  if (typeof window === "undefined") return true;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const days = JSON.parse(
      window.localStorage.getItem("play29:attendance-days") ?? "[]"
    ) as string[];
    return days.includes(today);
  } catch {
    return false;
  }
}

export function getOffPlayNudges(games: Game[]): OffPlayNudge[] {
  const nudges: OffPlayNudge[] = [];
  const mission = getDailyMission();
  const streak = getDailyStreak();
  const challenges = listChallenges().filter((c) => c.status !== "complete");
  const identity = buildReplayIdentityProfile(games);
  const kpis = getCoreKpis();

  if (!attendedToday()) {
    nudges.push({
      id: "attendance",
      message: "오늘 출석 안 했어요.",
      action: "출석하기",
      href: "/missions",
      priority: 10,
    });
  }

  if (!isDailyChallengeComplete(mission)) {
    const left = mission.missionIds.length - mission.completed.length;
    nudges.push({
      id: "mission",
      message: `미션 ${left}개 남았습니다.`,
      action: "미션 보기",
      href: "/missions",
      priority: 9,
    });
  }

  if (challenges.length > 0) {
    nudges.push({
      id: "challenge",
      message: `친구가 도전장을 ${challenges.length}개 보냈습니다.`,
      action: "도전장 확인",
      href: "/community#challenge",
      priority: 8,
    });
  }

  const topGap = Math.max(0, 50 - identity.replayScore / 20);
  if (topGap > 0 && identity.replayScore > 0) {
    nudges.push({
      id: "rank",
      message: `TOP50까지 Replay Score ${topGap}점 남았습니다.`,
      action: "플레이하기",
      href: identity.topGameSlug ? `/games/${identity.topGameSlug}` : "/games",
      priority: 7,
    });
  }

  if (streak.currentStreak >= 2 && kpis.d1Retention < 100) {
    nudges.push({
      id: "return",
      message: "내일도 streak을 이어가세요.",
      action: "Journey",
      href: "/journey",
      priority: 5,
    });
  }

  return nudges.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

export function buildReplayPassport(games: Game[]): ReplayPassport {
  const identity = buildReplayIdentityProfile(games);
  const mission = getDailyMission();
  const streak = getDailyStreak();
  const level = getLevelProgress();
  const season = getAttendanceStreak();

  return {
    level: level.level,
    title: identity.title,
    titleKo: identity.titleKo,
    replayScore: identity.replayScore,
    coins: getCoins(),
    collectionPercent: getOverallCollectionPercent(games),
    achievementCount: countGlobalAchievements(),
    streakDays: streak.currentStreak,
    genreCollections: getGenreCollections(games),
    pendingChallenges: listChallenges().filter((c) => c.status !== "complete").length,
    missionsLeft: Math.max(0, mission.missionIds.length - mission.completed.length),
    seasonLevel: Math.min(50, Math.floor(season / 2) + 1),
  };
}
