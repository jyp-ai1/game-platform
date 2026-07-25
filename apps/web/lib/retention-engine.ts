/** Game-end retention hooks — coins, missions, live sync. */
import { getBestScore, recordNewBest, setBestScore } from "@game-platform/game-sdk";

import { addCoins, coinsForScore } from "@/lib/coins";
import { emitLiveProfileUpdate } from "@/lib/live-data-bus";
import { isBossDefeated, getRuntimeConfig } from "@/lib/game-runtime-config";
import { recordWeeklyPlay } from "@/lib/weekly-challenge";

export interface GameEndRewards {
  coins: number;
  isNewBest: boolean;
  xpDisplay: number;
  bossBonus: number;
}

export function applyGameEndRetention(gameSlug: string, score: number): GameEndRewards {
  const best = getBestScore(gameSlug);
  const isNewBest = score > 0 && score > best;
  if (isNewBest) {
    setBestScore(gameSlug, score);
    recordNewBest(gameSlug, score);
  }
  recordWeeklyPlay();
  let bossBonus = 0;
  if (isBossDefeated(gameSlug, score)) {
    bossBonus = getRuntimeConfig(gameSlug).boss?.rewardCoins ?? 0;
  }
  const coins = addCoins(coinsForScore(score, isNewBest) + bossBonus);
  emitLiveProfileUpdate({ gameSlug, score, isNewBest });

  return {
    coins,
    isNewBest,
    xpDisplay: Math.max(10, Math.round(score / 50)),
    bossBonus,
  };
}
