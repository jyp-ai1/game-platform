/**
 * Universal Reward Engine — Coin/XP/Badge/Collection/Replay Score (Replay OS).
 */
import {
  getBestScore,
  getLastNickname,
  getTotalPlayCount,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";

import { getOverallCollectionPercent } from "@/lib/collection-engine";
import { getGameLibraryBadge } from "@/lib/library-store";
import type { GameEndRewards } from "@/lib/retention-engine";
import { applyGameEndRetention } from "@/lib/retention-engine";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import { checkPlatformAchievements } from "@/lib/achievement-engine";
import { getFriendBeatGap } from "@/lib/replay-identity";
import { recordSocialBeatEvent } from "@/lib/social-reactions-store";

export interface UniversalRewardBundle extends GameEndRewards {
  replayScoreGain: number;
  replayScoreTotal: number;
  badgeLabel: string;
  collectionPercent: number;
  newAchievements: string[];
}

export function applyUniversalRewards(
  gameSlug: string,
  score: number,
  games: Game[] = []
): UniversalRewardBundle {
  const base = applyGameEndRetention(gameSlug, score);
  const best = getBestScore(gameSlug);
  const replayScoreTotal = games.length > 0 ? buildWrappedSnapshot(games).replayScore : 0;
  const replayScoreGain = Math.max(10, Math.round(score / 100));
  const newAchievements = checkPlatformAchievements(gameSlug, score);

  if (typeof window !== "undefined") {
    const actor = getLastNickname() || "나";
    if (base.isNewBest) {
      recordSocialBeatEvent({
        actor,
        headline: `${gameSlug} 최고기록 ${score.toLocaleString()}점`,
        detail: "Replay Feed에 공유됨",
        gameSlug,
        score,
      });
    }
    const friend = getFriendBeatGap(gameSlug, score);
    if (friend.gap <= 0 && score > 0) {
      recordSocialBeatEvent({
        actor,
        headline: `친구 ${friend.nickname}보다 ${Math.abs(friend.gap).toLocaleString()}점 앞섬`,
        detail: "친구에게 알림",
        gameSlug,
        score,
      });
    }
  }

  return {
    ...base,
    replayScoreGain,
    replayScoreTotal,
    badgeLabel: getGameLibraryBadge(gameSlug, score, best),
    collectionPercent: games.length > 0 ? getOverallCollectionPercent(games) : 0,
    newAchievements,
  };
}

export function formatRewardSummary(rewards: UniversalRewardBundle): string[] {
  const lines = [
    `+${rewards.coins} Coin`,
    `+${rewards.xpDisplay} XP`,
    `+${rewards.replayScoreGain} Replay Score`,
  ];
  if (rewards.isNewBest) lines.push("New Best!");
  if (rewards.bossBonus > 0) lines.push(`Boss +${rewards.bossBonus}`);
  if (rewards.newAchievements.length > 0) {
    lines.push(`${rewards.newAchievements.length} Achievement`);
  }
  return lines;
}

export function getLifetimePlayLabel(): string {
  const total = getTotalPlayCount();
  if (total >= 100) return "100+ games played";
  if (total >= 50) return "50+ games played";
  if (total >= 10) return "10+ games played";
  return `${total} games played`;
}
