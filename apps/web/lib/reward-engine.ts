/**
 * Universal Reward Engine — Coin/XP/Badge/Collection/Replay Score (Replay OS).
 */
import {
  getBestScore,
  getTotalPlayCount,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";

import { getOverallCollectionPercent } from "@/lib/collection-engine";
import { getGameLibraryBadge } from "@/lib/library-store";
import type { GameEndRewards } from "@/lib/retention-engine";
import { applyGameEndRetention } from "@/lib/retention-engine";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import { checkPlatformAchievements } from "@/lib/achievement-engine";

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
