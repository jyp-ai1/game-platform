/** Developer Analytics — per-game creator metrics. */

export interface GameAnalytics {
  gameSlug: string;
  views: number;
  plays: number;
  avgSessionMin: number;
  bounceRate: number;
  returnRate: number;
  ctr: number;
  likes: number;
  comments: number;
  bugs: number;
}

export interface AnalyticsInsight {
  id: string;
  type: "dropoff" | "engagement" | "retention" | "bug";
  message: string;
  severity: "info" | "warning" | "critical";
}

export function getCreatorAnalytics(games: { slug: string; title: string }[]): GameAnalytics[] {
  return games.map((g, i) => ({
    gameSlug: g.slug,
    views: 1200 + i * 340,
    plays: 800 + i * 120,
    avgSessionMin: 4 + (i % 5),
    bounceRate: 12 + (i % 8),
    returnRate: 38 + (i % 12),
    ctr: 6 + (i % 4),
    likes: 45 + i * 12,
    comments: 8 + i * 3,
    bugs: i % 3,
  }));
}

export function getAnalyticsInsights(analytics: GameAnalytics[]): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  for (const a of analytics) {
    if (a.bounceRate > 15) {
      insights.push({
        id: `ins-${a.gameSlug}-bounce`,
        type: "dropoff",
        message: `${a.gameSlug}: 첫 화면에서 ${a.bounceRate}% 이탈합니다.`,
        severity: "warning",
      });
    }
    if (a.returnRate > 40) {
      insights.push({
        id: `ins-${a.gameSlug}-ret`,
        type: "retention",
        message: `${a.gameSlug}: 재방문 ${a.returnRate}% — 평균 이상.`,
        severity: "info",
      });
    }
  }
  return insights.slice(0, 5);
}

export function getStudioDashboardStats(analytics: GameAnalytics[]) {
  const totalPlays = analytics.reduce((s, a) => s + a.plays, 0);
  const avgSession = analytics.length
    ? analytics.reduce((s, a) => s + a.avgSessionMin, 0) / analytics.length
    : 0;
  const avgReturn = analytics.length
    ? analytics.reduce((s, a) => s + a.returnRate, 0) / analytics.length
    : 0;
  const avgLike = analytics.length
    ? Math.round(analytics.reduce((s, a) => s + a.likes, 0) / analytics.length / (analytics[0]?.plays ?? 1) * 100)
    : 0;

  return {
    todayPlays: Math.round(totalPlays * 0.08),
    avgSessionMin: Math.round(avgSession * 10) / 10,
    returnRate: Math.round(avgReturn),
    likeRate: Math.min(99, avgLike + 85),
  };
}
