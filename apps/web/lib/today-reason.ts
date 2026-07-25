/**
 * Today's Reason — why play today (Replay OS).
 */
import { getBestScore, getDailyStreak } from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";

import { listChallenges } from "@/lib/challenge-scores-store";
import { getOverallCollectionPercent, getGenreCollections } from "@/lib/collection-engine";
import { buildReplayIdentityProfile, getFriendBeatGap } from "@/lib/replay-identity";
import {
  getTodayMissionMix,
  getTodayMissionProgress,
  isTodayMissionMixComplete,
} from "@/lib/universal-mission-engine";

export interface TodayReason {
  headline: string;
  subline: string;
  href: string;
  rewardHint: string;
}

export function buildTodayReason(games: Game[]): TodayReason {
  const streak = getDailyStreak();
  const progress = getTodayMissionProgress();
  const mix = getTodayMissionMix();
  const pending = listChallenges().filter((c) => c.status !== "complete");
  const identity = buildReplayIdentityProfile(games);

  if (pending.length > 0) {
    const c = pending[0]!;
    return {
      headline: `${c.challengerNickname}의 도전장이 왔어요`,
      subline: `${c.gameTitle} — 이기고 리벤지하세요`,
      href: `/games/${c.gameSlug}?challenge=${c.id}`,
      rewardHint: "승리 시 +50 Coin",
    };
  }

  if (!isTodayMissionMixComplete()) {
    const next = mix.find((m) => !m.done);
    if (next) {
      return {
        headline: `오늘 ${progress.done}/${progress.total} — ${next.label}`,
        subline: streak.currentStreak > 0 ? `${streak.currentStreak}일 streak 유지 중` : "미션 완료하면 +100 Coin",
        href: next.href,
        rewardHint: `+${Math.max(30, (progress.total - progress.done) * 30)} XP 남음`,
      };
    }
  }

  const cols = getGenreCollections(games);
  const closest = cols.find((c) => c.percent > 0 && c.percent < 100);
  if (closest && closest.percent >= 60) {
    return {
      headline: `${closest.label} Collection ${closest.percent}% → 100%`,
      subline: `${closest.total - closest.completed}게임만 더`,
      href: `/categories/${closest.genre}`,
      rewardHint: "컬렉션 완성 보너스",
    };
  }

  if (identity.topGameSlug) {
    const friend = getFriendBeatGap(identity.topGameSlug, getBestScore(identity.topGameSlug));
    if (friend.gap > 0) {
      return {
        headline: `친구 ${friend.nickname}보다 ${friend.gap.toLocaleString()}점`,
        subline: `${identity.topGameTitle ?? identity.topGameSlug} 한 판 더`,
        href: `/games/${identity.topGameSlug}`,
        rewardHint: "Replay Score 상승",
      };
    }
  }

  const collection = getOverallCollectionPercent(games);
  return {
    headline: "오늘도 Replay 해야지",
    subline: identity.titleKo,
    href: identity.topGameSlug ? `/games/${identity.topGameSlug}` : "/games",
    rewardHint: `Collection ${collection}% · Lv.${identity.level}`,
  };
}
