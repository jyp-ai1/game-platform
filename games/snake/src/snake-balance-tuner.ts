/** Telemetry-driven world balance — Snake-only auto tuner */
import { getSnakeTelemetryHistory, type SnakeTelemetrySession } from "./snake-telemetry";

export interface SnakeWorldTuning {
  safeZoneMoveTicks: number;
  safeZoneHpDamage: number;
  collapseHpDamage: number;
  collapseShrinkEveryTicks: number;
  goldenSnakeIntervalTicks: number;
  goldenSnakeBaseReward: number;
  foodStormDurationMs: number;
  foodStormMultiplier: number;
  bossSpawnTick: number;
  safeZoneRadiusMult: number;
}

export interface TelemetryInsights {
  sessionCount: number;
  avgSurvivalMs: number;
  boostUsageRate: number;
  rematchRate: number;
  spectatorRejoinRate: number;
  avgDeathsPerSession: number;
  bossKillRate: number;
  eventParticipationRate: number;
}

const TUNING_KEY = "play29:snake-world-tuning";

export const DEFAULT_WORLD_TUNING: SnakeWorldTuning = {
  safeZoneMoveTicks: 300,
  safeZoneHpDamage: 2,
  collapseHpDamage: 3,
  collapseShrinkEveryTicks: 150,
  goldenSnakeIntervalTicks: 2000,
  goldenSnakeBaseReward: 120,
  foodStormDurationMs: 28_000,
  foodStormMultiplier: 2.8,
  bossSpawnTick: 350,
  safeZoneRadiusMult: 1.15,
};

export function analyzeSnakeTelemetry(sessions = getSnakeTelemetryHistory()): TelemetryInsights {
  if (sessions.length === 0) {
    return {
      sessionCount: 0,
      avgSurvivalMs: 0,
      boostUsageRate: 0,
      rematchRate: 0,
      spectatorRejoinRate: 0,
      avgDeathsPerSession: 0,
      bossKillRate: 0,
      eventParticipationRate: 0,
    };
  }
  const n = sessions.length;
  const avgSurvivalMs = sessions.reduce((s, x) => s + x.survivalMs, 0) / n;
  const totalTicks = sessions.reduce((s, x) => s + Math.max(1, Math.round(x.survivalMs / 100)), 0);
  const boostTicks = sessions.reduce((s, x) => s + x.boostTicks, 0);
  const rematchCount = sessions.filter((x) => x.rematch).length;
  const specCount = sessions.filter((x) => x.spectatorRejoin).length;
  const deaths = sessions.reduce((s, x) => s + x.deaths.length, 0);
  const bossKills = sessions.filter((x) => x.bossKills > 0).length;
  const eventSessions = sessions.filter((x) => Object.keys(x.eventParticipation).length > 0).length;

  return {
    sessionCount: n,
    avgSurvivalMs,
    boostUsageRate: boostTicks / totalTicks,
    rematchRate: rematchCount / n,
    spectatorRejoinRate: specCount / n,
    avgDeathsPerSession: deaths / n,
    bossKillRate: bossKills / n,
    eventParticipationRate: eventSessions / n,
  };
}

export function recommendWorldTuning(insights = analyzeSnakeTelemetry()): SnakeWorldTuning {
  const t = { ...DEFAULT_WORLD_TUNING };

  if (insights.sessionCount === 0) return t;

  if (insights.avgSurvivalMs < 180_000) {
    t.safeZoneHpDamage = 1;
    t.collapseHpDamage = 2;
    t.collapseShrinkEveryTicks = 180;
  } else if (insights.avgSurvivalMs > 420_000) {
    t.safeZoneHpDamage = 3;
    t.collapseHpDamage = 4;
    t.collapseShrinkEveryTicks = 120;
  }

  if (insights.boostUsageRate < 0.08) {
    t.foodStormDurationMs = 32_000;
    t.foodStormMultiplier = 3.2;
  }

  if (insights.rematchRate < 0.5) {
    t.goldenSnakeBaseReward = 150;
    t.goldenSnakeIntervalTicks = 1600;
  }

  if (insights.bossKillRate < 0.2) {
    t.bossSpawnTick = 280;
  }

  if (insights.eventParticipationRate < 0.3) {
    t.foodStormDurationMs = 34_000;
    t.goldenSnakeIntervalTicks = 1500;
  }

  return t;
}

export function loadWorldTuning(): SnakeWorldTuning {
  if (typeof window === "undefined") return DEFAULT_WORLD_TUNING;
  try {
    const raw = localStorage.getItem(TUNING_KEY);
    if (!raw) {
      const rec = recommendWorldTuning();
      localStorage.setItem(TUNING_KEY, JSON.stringify(rec));
      return rec;
    }
    return { ...DEFAULT_WORLD_TUNING, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_WORLD_TUNING;
  }
}

export function refreshWorldTuningFromTelemetry(): SnakeWorldTuning {
  const next = recommendWorldTuning();
  if (typeof window !== "undefined") {
    localStorage.setItem(TUNING_KEY, JSON.stringify(next));
  }
  return next;
}

export interface BalanceRecommendation {
  metric: string;
  value: number;
  target: number;
  suggestion: string;
}

export function generateBalanceRecommendations(insights = analyzeSnakeTelemetry()): BalanceRecommendation[] {
  const recs: BalanceRecommendation[] = [];
  const survivalMin = insights.avgSurvivalMs / 60_000;

  recs.push({
    metric: "평균 생존시간",
    value: survivalMin,
    target: 5,
    suggestion: survivalMin < 4 ? "HP 감소량 낮춤 · Safe Zone 주기 늘림" : survivalMin > 7 ? "Collapse 가속 · Boss 빈도 ↑" : "현재 밸런스 양호",
  });
  recs.push({
    metric: "Boost 사용률",
    value: insights.boostUsageRate * 100,
    target: 12,
    suggestion: insights.boostUsageRate < 0.1 ? "Boost 비용 ↓ · Food Storm ↑" : "Boost 손맛 양호",
  });
  recs.push({
    metric: "리매치율",
    value: insights.rematchRate * 100,
    target: 60,
    suggestion: insights.rematchRate < 0.6 ? "Golden Snake 보상 ↑ · Moment 하이라이트 강화" : "리텐션 양호",
  });
  recs.push({
    metric: "관전 후 재입장",
    value: insights.spectatorRejoinRate * 100,
    target: 40,
    suggestion: insights.spectatorRejoinRate < 0.4 ? "관전 CTA 강화 · Boss 추적 UX" : "관전 루프 양호",
  });
  recs.push({
    metric: "Boss 참여율",
    value: insights.bossKillRate * 100,
    target: 25,
    suggestion: insights.bossKillRate < 0.25 ? "Boss 등장 tick 앞당김" : "Boss 이벤트 양호",
  });
  return recs;
}
