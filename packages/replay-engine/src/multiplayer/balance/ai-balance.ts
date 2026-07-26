/** AI Balance Engine — recommends tuning from analytics. */
import type { AiBalanceRecommendation, ComputedBalance, MatchAnalyticsSnapshot } from "@game-platform/shared";

export function recommendBalance(
  balance: ComputedBalance,
  analytics: MatchAnalyticsSnapshot | null
): AiBalanceRecommendation {
  if (!analytics) {
    return {
      mapExpandPercent: 0,
      foodIncreasePercent: 0,
      respawnReduceMs: 0,
      rewardIncreasePercent: 0,
      reason: "데이터 수집 중 — 매치 후 추천 생성",
      confidence: 0.3,
    };
  }

  let mapExpand = 0;
  let foodIncrease = 0;
  let respawnReduce = 0;
  let rewardIncrease = 0;
  const reasons: string[] = [];

  if (analytics.congestionScore > 40) {
    mapExpand = Math.min(20, Math.round(analytics.congestionScore * 0.3));
    reasons.push(`맵 혼잡 ${analytics.congestionScore}% — ${mapExpand}% 확대 추천`);
  }

  if (analytics.foodShortageTicks > 10) {
    foodIncrease = Math.min(25, Math.round(analytics.foodShortageTicks * 0.8));
    reasons.push(`먹이 부족 ${analytics.foodShortageTicks}틱 — ${foodIncrease}% 증가`);
  }

  if (analytics.respawnCount > analytics.playerCount * 3) {
    respawnReduce = Math.min(2000, 500 + analytics.respawnCount * 50);
    reasons.push(`리스폰 반복 — ${Math.round(respawnReduce / 1000)}초 단축`);
  }

  if (analytics.churnCount > 0) {
    rewardIncrease = Math.min(10, analytics.churnCount * 2);
    reasons.push(`탈주 ${analytics.churnCount} — 보상 ${rewardIncrease}% 증가`);
  }

  if (balance.playerCount >= 20 && balance.mapScale < 7) {
    mapExpand = Math.max(mapExpand, 12);
    reasons.push("20명+ 매치 — 맵 12% 확대");
  }

  return {
    mapExpandPercent: mapExpand,
    foodIncreasePercent: foodIncrease,
    respawnReduceMs: respawnReduce,
    rewardIncreasePercent: rewardIncrease,
    reason: reasons.length ? reasons.join(" · ") : "밸런스 양호",
    confidence: reasons.length ? 0.85 : 0.6,
  };
}
