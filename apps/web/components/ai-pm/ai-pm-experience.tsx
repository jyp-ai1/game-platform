"use client";

import { buildAiPmSession } from "@/lib/ai-pm-engine";
import type { AiPmSession, ThinkingStep } from "@/lib/ai-pm-types";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AiPmActionCard } from "./action-card";
import { AiPmBriefing } from "./briefing";
import { AiPmConfidence } from "./confidence";
import { AiPmMicroQuestion } from "./micro-question";
import { AiPmThinkingTimeline } from "./thinking-timeline";
import { AiPmTodayHero } from "./today-hero";

const STORAGE_KEY = "replay:ai-pm-answers";

function loadAnswers(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveAnswers(answers: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch { /* ignore */ }
}

/** Full AI PM Experience 2.0 — Co-Founder PM session */
export function AiPmExperience() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [animatedSteps, setAnimatedSteps] = useState<ThinkingStep[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAnswers(loadAnswers());
    setMounted(true);
  }, []);

  const session: AiPmSession = useMemo(
    () => buildAiPmSession(answers),
    [answers]
  );

  // Animate thinking timeline — analysis never waits for founder (Rule 2)
  useEffect(() => {
    if (!mounted) return;
    const base = session.thinkingSteps.map((s, i) => ({
      ...s,
      status: i === 0 ? ("running" as const) : ("pending" as const),
    }));
    setAnimatedSteps(base);
    setAnalysisComplete(false);

    let idx = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function advance() {
      if (idx >= session.thinkingSteps.length) {
        setAnalysisComplete(true);
        return;
      }
      const delay = (session.thinkingSteps[idx]?.etaSeconds ?? 1) * 600;
      timers.push(
        setTimeout(() => {
          setAnimatedSteps((prev) =>
            prev.map((s, i) => {
              if (i < idx) return { ...s, status: "done" };
              if (i === idx) return { ...s, status: "done" };
              if (i === idx + 1) return { ...s, status: "running" };
              return s;
            })
          );
          idx += 1;
          advance();
        }, delay)
      );
    }
    advance();

    return () => timers.forEach(clearTimeout);
  }, [mounted, session.thinkingSteps]);

  const handleAnswer = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: optionId };
      saveAnswers(next);
      return next;
    });
  }, []);

  const unanswered = session.microQuestions.find((q) => !q.answered);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-primary">AI PM Experience 2.0</p>
        <h1 className="mt-1 text-2xl font-bold">함께 회사를 운영합니다</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          분석 결과가 아니라, AI PM과 함께 오늘의 결정을 내립니다.
        </p>
      </header>

      <AiPmTodayHero hero={session.hero} />

      <AiPmThinkingTimeline steps={animatedSteps.length ? animatedSteps : session.thinkingSteps} />

      {unanswered ? (
        <AiPmMicroQuestion question={unanswered} onAnswer={handleAnswer} />
      ) : session.founderInputsApplied.length > 0 ? (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
          <span className="font-medium text-emerald-400">Founder 의견 반영</span>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {session.founderInputsApplied.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {analysisComplete ? (
        <>
          <AiPmBriefing briefing={session.briefing} />
          <AiPmConfidence message={session.confidence} />
        </>
      ) : (
        <section className="rounded-xl border border-white/10 bg-muted/20 px-4 py-3 text-sm text-muted-foreground animate-pulse">
          AI PM이 분석을 마치면 브리핑을 드립니다…
        </section>
      )}

      <AiPmActionCard action={session.primaryAction} />
    </div>
  );
}
