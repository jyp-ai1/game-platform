"use client";

import type { ActionFeedback } from "@/lib/company-os-types";

/** Action Feedback Loop — celebrate completion together */
export function ActionFeedbackPanel({ feedback }: { feedback: ActionFeedback }) {
  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8 animate-in fade-in">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
        함께 달성
      </p>
      <p className="mt-3 whitespace-pre-line text-lg font-semibold leading-relaxed">
        {feedback.headline}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{feedback.body}</p>

      <div className="mt-6 flex items-center gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums">{feedback.completenessBefore}%</p>
          <p className="text-[10px] text-muted-foreground">이전</p>
        </div>
        <span className="text-2xl text-emerald-400">→</span>
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums text-emerald-400">
            {feedback.completenessAfter}%
          </p>
          <p className="text-[10px] text-muted-foreground">지금</p>
        </div>
      </div>

      {feedback.nextFocusHint ? (
        <p className="mt-4 text-sm text-muted-foreground">{feedback.nextFocusHint}</p>
      ) : null}
    </section>
  );
}
