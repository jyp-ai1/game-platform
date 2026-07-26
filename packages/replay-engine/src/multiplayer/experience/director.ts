/** AI Director — real-time balance intervention */
import type { DirectorAdjustment } from "@game-platform/shared";

export interface DirectorSignals {
  playerCount: number;
  congestionScore: number;
  foodShortageTicks: number;
  churnCount: number;
  deathRate: number;
  avgFoodRatio: number;
}

export function runDirector(signals: DirectorSignals): DirectorAdjustment {
  let mapExpandPercent = 0;
  let foodBoostPercent = 0;
  let rewardBoostPercent = 0;
  let respawnReduceMs = 0;
  const reasons: string[] = [];

  if (signals.congestionScore > 35) {
    mapExpandPercent = Math.min(15, Math.round(signals.congestionScore * 0.12));
    reasons.push("혼잡 → 맵 확장");
  }
  if (signals.playerCount <= 4 || signals.avgFoodRatio < 0.4) {
    foodBoostPercent = Math.max(foodBoostPercent, 20);
    reasons.push("플레이어 적음/먹이 부족 → 먹이 증가");
  }
  if (signals.churnCount > 0) {
    rewardBoostPercent = Math.min(15, signals.churnCount * 3);
    reasons.push("탈주 → 보상 증가");
  }
  if (signals.deathRate > 0.4) {
    respawnReduceMs = Math.min(1500, Math.round(signals.deathRate * 2000));
    reasons.push("사망률 높음 → 리스폰 개선");
  }

  return {
    mapExpandPercent,
    foodBoostPercent,
    rewardBoostPercent,
    respawnReduceMs,
    reason: reasons.join(" · ") || "Director stable",
  };
}

export const DirectorEngine = { run: runDirector };
