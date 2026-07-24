"use client";

import { useState, useTransition } from "react";

import { runAssistantTask } from "@/app/admin/assistant/actions";
import type { AssistantTask } from "@/lib/ops/assistant-generate";

const TASKS: Array<{ id: AssistantTask; label: string; description: string }> = [
  { id: "ops_summary", label: "오늘 Ops 요약", description: "DAU · 에러 · 인기 게임 분석" },
  { id: "notice_draft", label: "공지 초안", description: "CMS 공지용 초안 생성" },
  { id: "banner_copy", label: "배너 문구", description: "헤드라인 · CTA 카피" },
  { id: "event_plan", label: "이벤트 기획", description: "1주 참여 이벤트 제안" },
];

export function OpsAssistantPanel({ aiConfigured }: { aiConfigured: boolean }) {
  const [result, setResult] = useState<{ task: AssistantTask; content: string; source: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(task: AssistantTask) {
    setError(null);
    startTransition(async () => {
      try {
        const { content, source } = await runAssistantTask(task);
        setResult({ task, content, source });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`rounded-full px-3 py-1 font-medium ${
            aiConfigured
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {aiConfigured ? "AI 모드 (OpenAI)" : "규칙 엔진 모드"}
        </span>
        {!aiConfigured ? (
          <span className="text-muted-foreground">
            Vercel env에 `OPS_AI_API_KEY` 설정 시 LLM 생성 활성화
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TASKS.map((task) => (
          <button
            key={task.id}
            type="button"
            disabled={pending}
            onClick={() => run(task.id)}
            className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
          >
            <p className="font-medium">{task.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
          </button>
        ))}
      </div>

      {pending ? (
        <p className="text-sm text-muted-foreground">생성 중…</p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-medium">
              {TASKS.find((t) => t.id === result.task)?.label}
            </p>
            <span className="text-xs text-muted-foreground">
              {result.source === "ai" ? "AI 생성" : "규칙 엔진"}
            </span>
          </div>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">{result.content}</pre>
        </div>
      ) : null}
    </div>
  );
}
