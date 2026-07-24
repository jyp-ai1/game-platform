import type { OpsContext } from "./assistant-context";
import { summarizeOpsContext } from "./assistant-context";

export type AssistantTask =
  | "ops_summary"
  | "notice_draft"
  | "banner_copy"
  | "event_plan";

const TASK_PROMPTS: Record<AssistantTask, string> = {
  ops_summary:
    "You are Re:Play's operations analyst. Summarize today's platform health in Korean (3-5 bullets). Focus on DAU, errors, top games, and actionable next steps. Be concise and factual — only use provided data.",
  notice_draft:
    "Write a Korean site notice draft (title + 2-3 sentences body) for Re:Play casual game platform. Use provided ops data to justify the notice theme (maintenance, event, or engagement). Mark as [DRAFT].",
  banner_copy:
    "Write Korean banner copy for Re:Play: headline (max 20 chars), subtext (max 40 chars), CTA button label. Recommend promoting the top game from data. Mark as [DRAFT].",
  event_plan:
    "Propose a 1-week engagement event for Re:Play in Korean: event name, goal, target game, simple rules, expected KPI. Use provided data. Mark as [DRAFT].",
};

function fallbackOpsSummary(ctx: OpsContext): string {
  const parts: string[] = ["## 오늘의 Ops 요약 (규칙 엔진)"];
  if (ctx.realtime) {
    parts.push(
      `- 현재 접속 ${ctx.realtime.online_users}명 · 플레이 중 ${ctx.realtime.playing_now}명 · 오늘 ${ctx.realtime.today_plays}회 플레이`
    );
    if (ctx.realtime.errors_1h > 0) {
      parts.push(`- ⚠️ 최근 1시간 에러 ${ctx.realtime.errors_1h}건 — Error Center 확인 필요`);
    }
  }
  if (ctx.kpis) {
    parts.push(
      `- DAU ${ctx.kpis.dau} · WAU ${ctx.kpis.wau} · Stickiness ${ctx.kpis.stickiness}%`
    );
  }
  if (ctx.top_games[0]) {
    parts.push(`- 이번 주 인기 1위: **${ctx.top_games[0].title}** (${ctx.top_games[0].plays} plays)`);
  }
  parts.push("\n_LLM 연동: `OPS_AI_API_KEY` 설정 시 AI 생성 요약 사용_");
  return parts.join("\n");
}

function fallbackNoticeDraft(ctx: OpsContext): string {
  const top = ctx.top_games[0];
  return `[DRAFT] 공지 초안

**제목:** ${top ? `${top.title} 주간 챌린지 오픈!` : "Re:Play 신규 이벤트"}

**본문:** 이번 주 가장 인기 있는 게임${top ? ` **${top.title}**` : ""}에서 최고 점수에 도전해 보세요. 랭킹에 등록하면 XP 보너스를 받을 수 있습니다.

_규칙 기반 초안 · OPS_AI_API_KEY 설정 시 AI 개선_`;
}

function fallbackBannerCopy(ctx: OpsContext): string {
  const top = ctx.top_games[0];
  return `[DRAFT] 배너 문구

**헤드라인:** ${top ? `${top.title} 도전!` : "지금 바로 플레이"}
**서브:** ${top ? `이번 주 ${top.plays}회 플레이된 인기 게임` : "3초 만에 게임 시작"}
**CTA:** 플레이하기

_규칙 기반 초안 · OPS_AI_API_KEY 설정 시 AI 개선_`;
}

function fallbackEventPlan(ctx: OpsContext): string {
  const top = ctx.top_games[0];
  return `[DRAFT] 1주 이벤트 기획

**이벤트명:** ${top ? `${top.title} 마스터 챌린지` : "Weekly Play Fest"}
**목표:** 주간 플레이 수 10% 증가
**대상 게임:** ${top?.slug ?? "snake"}
**규칙:** 7일간 해당 게임 3회 이상 플레이 시 XP 보너스
**KPI:** session_start, score_submit, returning_users

_규칙 기반 초안 · OPS_AI_API_KEY 설정 시 AI 개선_`;
}

const FALLBACKS: Record<AssistantTask, (ctx: OpsContext) => string> = {
  ops_summary: fallbackOpsSummary,
  notice_draft: fallbackNoticeDraft,
  banner_copy: fallbackBannerCopy,
  event_plan: fallbackEventPlan,
};

async function callOpenAI(
  apiKey: string,
  task: AssistantTask,
  ctx: OpsContext
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPS_AI_MODEL ?? "gpt-4o-mini",
      max_tokens: 900,
      temperature: 0.4,
      messages: [
        { role: "system", content: TASK_PROMPTS[task] },
        {
          role: "user",
          content: `Platform ops data:\n${summarizeOpsContext(ctx)}\n\nFull JSON:\n${JSON.stringify(ctx, null, 2).slice(0, 4000)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty AI response");
  }
  return content;
}

export async function generateAssistantContent(
  task: AssistantTask,
  ctx: OpsContext
): Promise<{ content: string; source: "ai" | "rules" }> {
  const apiKey = process.env.OPS_AI_API_KEY ?? process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const content = await callOpenAI(apiKey, task, ctx);
      return { content, source: "ai" };
    } catch (err) {
      console.error("AI assistant fallback:", err);
      return {
        content: `${FALLBACKS[task](ctx)}\n\n---\n_AI 생성 실패: ${err instanceof Error ? err.message : "unknown"}_`,
        source: "rules",
      };
    }
  }

  return { content: FALLBACKS[task](ctx), source: "rules" };
}

export function isAiAssistantConfigured(): boolean {
  return Boolean(process.env.OPS_AI_API_KEY ?? process.env.OPENAI_API_KEY);
}
