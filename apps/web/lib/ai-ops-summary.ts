/**
 * AI Operations — daily auto-summary for /admin/operations (Replay OS).
 */
import { getCoreKpis, getFailureRate, getTodayMetrics } from "@/lib/product-metrics-store";

export interface OpsSummary {
  headline: string;
  bullets: string[];
  health: "good" | "watch" | "critical";
}

export function buildAiOpsSummary(bugCount = 0): OpsSummary {
  const today = getTodayMetrics();
  const kpis = getCoreKpis();
  const failureRate = getFailureRate();
  const bugs = Math.max(today.bugs, bugCount);

  const bullets: string[] = [
    `오늘 재방문 ${kpis.d1Retention}% — DAU ${kpis.dau}`,
    `Mission 활동 ${today.gameEnds}판 · Challenge ${today.challenges}건`,
    `공유 ${today.shares + today.invites} · 랭킹 ${today.rankings}건`,
    `버그 ${bugs}건 · 실패율 ${failureRate}%`,
  ];

  let health: OpsSummary["health"] = "good";
  if (bugs > 3 || failureRate > 8) health = "critical";
  else if (bugs > 0 || kpis.d1Retention < 25) health = "watch";

  const headline =
    health === "good"
      ? "Replay Loop 안정 — 오늘도 플레이 사이클이 돌아가고 있습니다."
      : health === "watch"
        ? "주의: 재방문 또는 버그 지표를 확인하세요."
        : "긴급: 버그·실패율이 높습니다. 배포 점검이 필요합니다.";

  return { headline, bullets, health };
}
