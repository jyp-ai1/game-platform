"use client";

import type { MicroQuestion } from "@/lib/ai-pm-types";
import { cn } from "@game-platform/ui";

/** Founder Co-working — micro questions that never block analysis (Rule 2) */
export function AiPmMicroQuestion({
  question,
  onAnswer,
}: {
  question: MicroQuestion;
  onAnswer: (questionId: string, optionId: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
        함께 결정해 주세요 · 분석은 계속됩니다
      </p>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{question.prompt}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {question.options.map((opt) => {
          const selected = question.answered === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onAnswer(question.id, opt.id)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                selected
                  ? "border-violet-400 bg-violet-500/20 font-medium text-violet-100"
                  : "border-white/10 bg-card/50 hover:border-violet-400/40 hover:bg-violet-500/10"
              )}
            >
              ○ {opt.label}
            </button>
          );
        })}
      </div>
      {question.answered ? (
        <p className="mt-3 text-xs text-emerald-400">✓ Founder 의견 반영됨</p>
      ) : null}
    </section>
  );
}
