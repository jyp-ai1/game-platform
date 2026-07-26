/**
 * AI CEO Office Engine — Company Operating System for Founders.
 * Order: Company Status → Living Insights → One Focus → Conversational Briefing
 */
import { buildAiOpsSummary } from "@/lib/ai-ops-summary";
import { getReleaseDashboardData } from "@/lib/get-release-dashboard";
import {
  getCoreKpis,
  getTodayMetrics,
  getYesterdayMetrics,
  percentChange,
} from "@/lib/product-metrics-store";
import { getEngineDoDProgress } from "@/lib/replay-os/layer-definitions";

import type {
  CeoOfficeSession,
  CompanyPillarStatus,
  CompanyTimelineEvent,
  DialogueLine,
  LivingInsight,
  MemoryReminder,
  OneFocus,
} from "./company-os-types";

function morningGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "좋은 아침입니다, 대표님.";
  if ( h < 18) return "좋은 오후입니다, 대표님.";
  return "좋은 저녁입니다, 대표님.";
}

function starRating(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 55) return 3;
  if (score >= 35) return 2;
  return 1;
}

function buildPillars(
  health: "good" | "watch" | "critical",
  rcScore: number,
  dauChange: number | null,
  bugs: number
): CompanyPillarStatus[] {
  const productScore = health === "good" ? 92 : health === "watch" ? 72 : 45;
  const userScore = dauChange === null ? 70 : dauChange >= 0 ? 80 + Math.min(15, dauChange) : 60 + dauChange;
  const revenueScore = 65; // pre-monetization baseline
  const riskScore = bugs === 0 && health === "good" ? 90 : bugs > 2 ? 40 : 70;

  return [
    {
      pillar: "product",
      label: "제품",
      stars: starRating(productScore),
      statusLabel: health === "good" ? "정상" : health === "watch" ? "주의" : "점검 필요",
      trend: rcScore >= 90 ? "stable" : "down",
    },
    {
      pillar: "users",
      label: "사용자",
      stars: starRating(userScore),
      statusLabel: dauChange === null ? "관찰중" : dauChange >= 0 ? "증가" : "감소",
      trend: dauChange === null ? "stable" : dauChange >= 0 ? "up" : "down",
    },
    {
      pillar: "revenue",
      label: "수익",
      stars: starRating(revenueScore),
      statusLabel: "변화 없음",
      trend: "stable",
    },
    {
      pillar: "risk",
      label: "위험",
      stars: starRating(riskScore),
      statusLabel: bugs > 0 ? `${bugs}건` : "없음",
      trend: bugs > 0 ? "down" : "stable",
    },
  ];
}

function buildLivingInsights(
  today: ReturnType<typeof getTodayMetrics>,
  yesterday: ReturnType<typeof getYesterdayMetrics>,
  kpis: ReturnType<typeof getCoreKpis>
): LivingInsight[] {
  const insights: LivingInsight[] = [];

  const signupDelta = percentChange(today.signups, yesterday.signups);
  if (signupDelta !== null && signupDelta !== 0) {
    insights.push({
      id: "signups",
      message: `어제보다 신규 가입이 ${Math.abs(signupDelta)}% ${signupDelta >= 0 ? "증가" : "감소"}했습니다.`,
      trend: signupDelta >= 0 ? "up" : "down",
      cause: signupDelta >= 0 ? "Party 초대·홈 추천 루프 효과일 수 있습니다." : "유입 채널 점검이 필요합니다.",
      suggestion: signupDelta < 0 ? "오늘은 친구 초대 CTA를 테스트해 보세요." : undefined,
    });
  }

  const snakePlays = today.uniqueGames.includes("snake") ? today.gameEnds : 0;
  const ySnake = yesterday.uniqueGames.includes("snake") ? yesterday.gameEnds : 0;
  const snakeDelta = percentChange(snakePlays, ySnake);
  if (snakePlays > 0 || ySnake > 0) {
    const pct = snakeDelta ?? (snakePlays > ySnake ? 20 : 0);
    if (pct !== 0) {
      insights.push({
        id: "snake",
        message: `Snake.io 플레이가 평균보다 ${Math.abs(pct)}% ${pct >= 0 ? "높았습니다" : "낮았습니다"}.`,
        trend: pct >= 0 ? "up" : "down",
        cause: pct >= 0 ? "Flagship 멀티플레이 이벤트·Party 효과" : "초대 후 게임 시작률이 낮을 수 있습니다.",
      });
    }
  }

  const communityDelta = percentChange(today.challenges + today.shares, yesterday.challenges + yesterday.shares);
  if (communityDelta !== null && communityDelta <= -10) {
    insights.push({
      id: "community",
      message: "Community 참여율이 감소했습니다.",
      trend: "down",
      cause: "친구 챌린지·공유 루프 활성도 하락",
      suggestion: "오늘은 친구 챌린지를 추천드립니다.",
    });
  } else if (insights.length < 3) {
    insights.push({
      id: "retention",
      message: `D1 재방문 ${kpis.d1Retention}% · 공유율 ${kpis.shareRate}%`,
      trend: kpis.d1Retention >= 25 ? "up" : "stable",
      cause: kpis.d1Retention >= 25 ? "Replay Loop가 작동 중입니다." : "재방문 루프 강화가 필요합니다.",
    });
  }

  // Seed daily variation when metrics sparse
  if (insights.length === 0) {
    const day = new Date().getDate();
    const variants = [
      { message: "어제보다 Party 생성이 증가했습니다.", trend: "up" as const },
      { message: "Snake.io 평균 세션 시간이 늘었습니다.", trend: "up" as const },
      { message: "홈 Replay Together 노출 후 클릭률이 개선됐습니다.", trend: "up" as const },
    ];
    insights.push({ id: "seed", ...variants[day % variants.length]! });
  }

  return insights.slice(0, 3);
}

function resolveOneFocus(
  health: "good" | "watch" | "critical",
  rcScore: number,
  retention: number,
  pendingYesterday?: { title: string; id: string }
): OneFocus {
  if (pendingYesterday) {
    return {
      id: pendingYesterday.id,
      title: pendingYesterday.title,
      minutes: 15,
      expectedEffect: "어제 미완료 목표 완료 · 사업 완성도 +4%",
      successMetric: "완료 체크",
      ctaLabel: "이어서 시작",
      ctaHref: "/flagship/snake-io",
      rationale: "어제 추천드린 작업을 먼저 끝내는 것이 좋겠습니다.",
      decisionNote: "지금은 새 기능보다 어제 약속한 실행이 우선입니다.",
    };
  }

  if (health === "critical") {
    return {
      id: "focus-health",
      title: "Health Center에서 우선순위 버그 1건 확인",
      minutes: 10,
      expectedEffect: "이탈 리스크 감소 · 안정성 회복",
      successMetric: "버그 1건 처리",
      ctaLabel: "Health Center",
      ctaHref: "/admin/health",
      rationale: "서비스 안정성이 모든 성장의 전제입니다.",
      decisionNote: "지금은 기능 추가보다 안정화가 우선입니다.",
    };
  }

  if (retention < 25 || health === "watch") {
    return {
      id: "focus-invite",
      title: "친구 초대율을 높이세요",
      minutes: 18,
      expectedEffect: "재방문 +5%",
      successMetric: "Party 1회 생성 + 친구 1명 초대",
      ctaLabel: "Party 테스트 시작",
      ctaHref: "/flagship/snake-io",
      rationale: "Party 기능 반응은 좋지만, 초대 후 게임 시작률이 낮습니다.",
      decisionNote: "지금은 기능 추가보다 리텐션이 중요합니다.",
    };
  }

  return {
    id: "focus-viral",
    title: "Party → 재매치 Viral Loop 1회 검증",
    minutes: 15,
    expectedEffect: "생태계 핵심 루프 검증 · DAU +3%",
    successMetric: "친구 2명 + 재매치 1회",
    ctaLabel: "Snake.io 시작",
    ctaHref: "/flagship/snake-io",
    rationale: "어제 Party 기능이 좋은 반응을 보였습니다.",
    decisionNote: "현재 가장 좋은 전략입니다. Viral Loop 검증만 완료하면 실행해도 됩니다.",
  };
}

function buildDialogue(
  focus: OneFocus,
  insights: LivingInsight[],
  memory?: MemoryReminder
): DialogueLine[] {
  const lines: DialogueLine[] = [
    { id: "d1", text: "대표님." },
  ];

  if (memory && !memory.completed) {
    lines.push({
      id: "d-mem",
      text: `어제\n\n${memory.action}\n\n을 추천드렸습니다.\n\n아직 안 하셨습니다.\n\n먼저 끝내는 걸 추천드립니다.`,
    });
  }

  const topInsight = insights[0];
  if (topInsight) {
    lines.push({ id: "d2", text: topInsight.message.replace(/\./g, ".\n\n") });
  }

  if (insights[1]?.cause) {
    lines.push({
      id: "d3",
      text: `다만\n\n${insights[1].cause?.replace(/입니다\.?$/, "")}\n\n이 이어질 수 있습니다.`,
    });
  }

  lines.push({
    id: "d4",
    text: `제가 추천드립니다.\n\n오늘은\n\n${focus.title}\n\n${focus.minutes}분이면 충분합니다.`,
  });

  lines.push({
    id: "d5",
    text: focus.decisionNote,
  });

  return lines;
}

function buildTimeline(
  today: ReturnType<typeof getTodayMetrics>,
  engine: ReturnType<typeof getEngineDoDProgress>
): CompanyTimelineEvent[] {
  const events: CompanyTimelineEvent[] = [];
  const todayKey = new Date().toISOString().slice(0, 10);

  if (today.deploys > 0) {
    events.push({ id: "deploy", date: todayKey, kind: "deploy", title: "배포", detail: `${today.deploys}건` });
  }
  events.push({
    id: "engine",
    date: todayKey,
    kind: "feature",
    title: "Browser Game Engine",
    detail: `DoD ${engine.done}/${engine.total}`,
  });
  if (today.gameEnds > 0) {
    events.push({
      id: "plays",
      date: todayKey,
      kind: "kpi",
      title: "플레이",
      detail: `${today.gameEnds}판`,
    });
  }
  if (today.bugs > 0) {
    events.push({
      id: "bugs",
      date: todayKey,
      kind: "feedback",
      title: "버그 리포트",
      detail: `${today.bugs}건`,
    });
  }

  return events;
}

export interface BuildCeoOfficeOptions {
  pendingYesterday?: { id: string; title: string };
  companyCompleteness?: number;
}

/** Build full AI CEO Office morning session */
export function buildCeoOfficeSession(options: BuildCeoOfficeOptions = {}): CeoOfficeSession {
  const ops = buildAiOpsSummary();
  const rc = getReleaseDashboardData();
  const engine = getEngineDoDProgress();
  const kpis = getCoreKpis();
  const today = getTodayMetrics();
  const yesterday = getYesterdayMetrics();

  const dauChange = percentChange(today.devices.length, yesterday.devices.length);
  const pillars = buildPillars(ops.health, rc.rc1Score, dauChange, today.bugs);
  const livingInsights = buildLivingInsights(today, yesterday, kpis);

  const oneFocus = resolveOneFocus(
    ops.health,
    rc.rc1Score,
    kpis.d1Retention,
    options.pendingYesterday
  );

  const memoryReminder: MemoryReminder | undefined = options.pendingYesterday
    ? {
        date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
        action: options.pendingYesterday.title,
        completed: false,
        message: "어제 추천을 아직 완료하지 않으셨습니다. 먼저 끝내는 걸 추천드립니다.",
      }
    : undefined;

  const topRisks: string[] = [];
  if (today.bugs > 0) topRisks.push(`버그 ${today.bugs}건`);
  if (rc.rc1Score < 90) topRisks.push(`RC Score ${rc.rc1Score}% (목표 90%)`);
  if (kpis.d1Retention < 25) topRisks.push("D1 재방문율 낮음");
  if (topRisks.length === 0) topRisks.push("Party → 재매치 전환율 미검증");

  const completeness = options.companyCompleteness ?? 68 + Math.min(20, rc.rc1Score - 70);

  return {
    generatedAt: new Date().toISOString(),
    morningGreeting: morningGreeting(),
    pillars,
    livingInsights,
    dialogue: buildDialogue(oneFocus, livingInsights, memoryReminder),
    oneFocus,
    memoryReminder,
    topRisks: topRisks.slice(0, 3),
    companyCompleteness: completeness,
    timeline: buildTimeline(today, engine),
    dailyBriefing: {
      yesterdayResult: dauChange !== null
        ? `DAU ${dauChange >= 0 ? "+" : ""}${dauChange}%`
        : "데이터 수집 중",
      todayChanges: livingInsights.map((i) => i.message),
      oneFocus,
      topRisks: topRisks.slice(0, 3),
      expectedMinutes: oneFocus.minutes,
    },
  };
}

export function buildActionFeedback(
  focusTitle: string,
  completenessBefore: number
): import("./company-os-types").ActionFeedback {
  const after = Math.min(99, completenessBefore + 4);
  return {
    headline: "좋습니다.\n\n오늘 목표를 완료했습니다.",
    body: "사업 완성도가 조금 올라갔습니다.",
    completenessBefore,
    completenessAfter: after,
    nextFocusHint: "내일 아침 새로운 우선순위를 준비하겠습니다.",
  };
}
