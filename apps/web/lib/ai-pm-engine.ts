/**
 * AI PM Engine — builds Co-Founder PM session from live ops data.
 * Rule: show WHY before WHAT. Always propose action, never just report problems.
 */
import { buildAiOpsSummary } from "@/lib/ai-ops-summary";
import { getEngineDoDProgress } from "@/lib/replay-os/layer-definitions";
import { getReleaseDashboardData } from "@/lib/get-release-dashboard";
import { getCoreKpis } from "@/lib/product-metrics-store";

import type {
  ActionProposal,
  AiPmSession,
  BriefingBeat,
  ConfidenceMessage,
  MicroQuestion,
  ThinkingStep,
  TodayHero,
} from "./ai-pm-types";
import { formatBriefingGreeting, formatConfidence } from "./ai-pm-communication";

function buildThinkingSteps(
  health: "good" | "watch" | "critical",
  rcScore: number,
  engineDone: number,
  engineTotal: number
): ThinkingStep[] {
  const ecosystemGap = engineTotal - engineDone;
  return [
    {
      id: "market",
      label: "시장 조사",
      why: "비슷한 서비스가 있는지 확인해야 우리 서비스의 차별점을 찾을 수 있기 때문입니다.",
      founderValue: "Roblox·Fortnite Creative 대비 Replay의 포지셔닝을 명확히 합니다.",
      etaSeconds: 2,
      status: "done",
    },
    {
      id: "competitor",
      label: "경쟁사 분석",
      why: "가격 전략과 포지셔닝을 결정하기 위해서입니다.",
      founderValue: "Browser Game Ecosystem vs 단일 게임 플랫폼 차이를 정리합니다.",
      etaSeconds: 1,
      status: "done",
    },
    {
      id: "growth",
      label: "성장 지표 검토",
      why: "사용자가 매일 돌아오는 구조인지 확인하기 위해서입니다.",
      founderValue: health === "good" ? "Replay Loop가 정상 작동 중입니다." : "재방문·버그 리스크를 조기에 발견합니다.",
      etaSeconds: 2,
      status: health === "critical" ? "running" : "done",
    },
    {
      id: "engine",
      label: "Engine DoD 점검",
      why: "게임 SDK가 아닌 Browser Game Engine까지 올라갔는지 확인하기 위해서입니다.",
      founderValue: `Engine ${engineDone}/${engineTotal} 완료 — 생태계 기반 ${Math.round((engineDone / engineTotal) * 100)}%`,
      etaSeconds: 2,
      status: ecosystemGap > 2 ? "running" : "done",
    },
    {
      id: "release",
      label: "릴리즈 게이트",
      why: "배포해도 되는 상태인지 확인하기 위해서입니다.",
      founderValue: `RC Score ${rcScore}% — ${rcScore >= 90 ? "배포 가능" : "추가 QA 필요"}`,
      etaSeconds: 1,
      status: rcScore >= 90 ? "done" : "pending",
    },
    {
      id: "action",
      label: "실행 계획 생성",
      why: "분석을 보고서로 끝내지 않고, 오늘 할 행동으로 연결하기 위해서입니다.",
      founderValue: "대표님이 15~20분 투자하면 가장 큰 리스크 하나를 제거할 수 있습니다.",
      etaSeconds: 1,
      status: "pending",
    },
  ];
}

function buildMicroQuestions(): MicroQuestion[] {
  return [
    {
      id: "mq-customer",
      kind: "target_customer",
      prompt: "시장 조사를 진행하는 동안\n\n하나만 알려주세요.\n\n주 고객은 누구인가요?",
      options: [
        { id: "student", label: "학생" },
        { id: "worker", label: "직장인" },
        { id: "enterprise", label: "기업" },
        { id: "unknown", label: "아직 모르겠습니다" },
      ],
    },
    {
      id: "mq-goal",
      kind: "primary_goal",
      prompt: "가장 중요한 목표는?",
      options: [
        { id: "users", label: "사용자 확보" },
        { id: "revenue", label: "매출" },
        { id: "investment", label: "투자" },
        { id: "unknown", label: "아직 모름" },
      ],
    },
  ];
}

function resolvePrimaryAction(
  health: "good" | "watch" | "critical",
  rcScore: number,
  retention: number
): ActionProposal {
  if (health === "critical") {
    return {
      title: "버그 3건 이상 — 오늘 Health Center에서 우선순위 버그 1건을 확인하세요",
      minutes: 10,
      expectedEffect: "서비스 안정성 회복 · 이탈 리스크 감소",
      ctaLabel: "Health Center 시작",
      ctaHref: "/admin/health",
    };
  }
  if (rcScore < 90) {
    return {
      title: "RC Score 미달 — QA 체크리스트 1회 실행 후 점수를 올리세요",
      minutes: 15,
      expectedEffect: "배포 게이트 통과 · RC Score +3~5%",
      ctaLabel: "Release Dashboard 시작",
      ctaHref: "/admin/release-dashboard",
    };
  }
  if (retention < 25) {
    return {
      title: "재방문율 개선 — Party 초대 루프를 1회 직접 테스트하세요",
      minutes: 18,
      expectedEffect: "Viral Loop 검증 · D1 Retention +2~4%",
      ctaLabel: "Snake.io Party 테스트",
      ctaHref: "/flagship/snake-io",
    };
  }
  return {
    title: "Flagship Snake.io — 친구 2명 초대 후 Party → 재매치 루프를 검증하세요",
    minutes: 15,
    expectedEffect: "생태계 핵심 루프 검증 · 사업 완성도 +4%",
    ctaLabel: "Party 테스트 시작",
    ctaHref: "/flagship/snake-io",
  };
}

function buildHero(action: ActionProposal, rcScore: number): TodayHero {
  const before = Math.min(95, Math.max(60, rcScore - 4));
  const after = Math.min(99, before + 4);
  return {
    minutesNeeded: action.minutes,
    reason: "오늘 완료하면 가장 큰 리스크 하나를 제거할 수 있습니다.",
    expectedEffect: action.expectedEffect,
    beforePercent: before,
    afterPercent: after,
    recommendedAction: action.title,
    ctaLabel: action.ctaLabel,
    ctaHref: action.ctaHref,
  };
}

function buildBriefing(
  action: ActionProposal,
  health: "good" | "watch" | "critical",
  rcScore: number
): BriefingBeat {
  const goodNews =
    health === "good"
      ? "현재 방향은 충분히 가능성이 있습니다."
      : health === "watch"
        ? "방향은 맞지만, 지표 1~2개를 오늘 점검하면 리스크가 줄어듭니다."
        : "방향은 유지하되, 오늘 안정화 작업이 최우선입니다.";

  const risk =
    health === "critical"
      ? "버그·실패율이 높아 이탈 리스크가 있습니다."
      : rcScore < 90
        ? "릴리즈 게이트 미달 — 배포 전 QA가 필요합니다."
        : "Party Viral Loop가 실제 DAU로 이어지는지 검증이 필요합니다.";

  return {
    greeting: formatBriefingGreeting(),
    goodNews,
    biggestRisk: risk,
    todayRecommendation: action.title,
    minutesNeeded: action.minutes,
    expectedEffect: action.expectedEffect,
    ctaLabel: action.ctaLabel,
    ctaHref: action.ctaHref,
  };
}

function buildConfidence(
  health: "good" | "watch" | "critical",
  rcScore: number
): ConfidenceMessage {
  if (health === "good" && rcScore >= 90) {
    return {
      headline: formatConfidence("현재 가장 좋은 전략입니다.", "Party Viral Loop 실전 검증만 완료하면 실행해도 됩니다."),
      body: "기능 추가보다 친구 3명이 매일 들어오는 구조를 만드는 것이 우선입니다.",
      priority: "사용자 확보 · Viral Loop",
    };
  }
  if (health === "watch") {
    return {
      headline: formatConfidence("방향은 올바릅니다.", "오늘 지표 1개만 점검하면 확신이 올라갑니다."),
      body: "투자보다 사용자 확보가 더 중요한 시점입니다.",
      priority: "재방문율 · Party Loop",
    };
  }
  return {
    headline: formatConfidence("오늘 안정화가 최우선입니다.", "버그 해결 후 Viral Loop 검증으로 넘어가면 됩니다."),
    body: "기능 추가보다 서비스 안정성이 먼저입니다.",
    priority: "버그 해결 · Health Center",
  };
}

function applyFounderInputs(
  questions: MicroQuestion[],
  answers: Record<string, string>
): string[] {
  const applied: string[] = [];
  for (const q of questions) {
    const ans = answers[q.id];
    if (!ans) continue;
    const opt = q.options.find((o) => o.id === ans);
    if (opt && ans !== "unknown") {
      applied.push(`${q.prompt.split("\n").pop() ?? q.kind}: ${opt.label}`);
    }
  }
  return applied;
}

/** Build full AI PM session from live ops context */
export function buildAiPmSession(founderAnswers: Record<string, string> = {}): AiPmSession {
  const ops = buildAiOpsSummary();
  const rc = getReleaseDashboardData();
  const engine = getEngineDoDProgress();
  const kpis = getCoreKpis();

  const questions = buildMicroQuestions().map((q) => ({
    ...q,
    answered: founderAnswers[q.id],
  }));

  const action = resolvePrimaryAction(ops.health, rc.rc1Score, kpis.d1Retention);
  const applied = applyFounderInputs(questions, founderAnswers);

  return {
    generatedAt: new Date().toISOString(),
    thinkingSteps: buildThinkingSteps(ops.health, rc.rc1Score, engine.done, engine.total),
    microQuestions: questions,
    hero: buildHero(action, rc.rc1Score),
    briefing: buildBriefing(action, ops.health, rc.rc1Score),
    confidence: buildConfidence(ops.health, rc.rc1Score),
    primaryAction: action,
    founderInputsApplied: applied,
  };
}

/** Recompute session after founder answers a micro-question */
export function applyMicroAnswer(
  session: AiPmSession,
  questionId: string,
  optionId: string
): AiPmSession {
  const answers: Record<string, string> = {};
  for (const q of session.microQuestions) {
    if (q.answered) answers[q.id] = q.answered;
  }
  answers[questionId] = optionId;
  return buildAiPmSession(answers);
}
