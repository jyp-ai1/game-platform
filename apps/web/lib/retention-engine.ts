/** Game-end retention hooks — coins, missions, live sync. */
import { getBestScore } from "@game-platform/game-sdk";

import { addCoins, coinsForScore } from "@/lib/coins";
import { emitLiveProfileUpdate } from "@/lib/live-data-bus";
import { recordWeeklyPlay } from "@/lib/weekly-challenge";

export interface GameEndRewards {
  coins: number;
  isNewBest: boolean;
  xpDisplay: number;
}

export function applyGameEndRetention(gameSlug: string, score: number): GameEndRewards {
  const best = getBestScore(gameSlug);
  const isNewBest = score > 0 && score >= best;
  recordWeeklyPlay();
  const coins = addCoins(coinsForScore(score, isNewBest));
  emitLiveProfileUpdate({ gameSlug, score, isNewBest });

  return {
    coins,
    isNewBest,
    xpDisplay: Math.max(10, Math.round(score / 50)),
  };
}
