"use client";

import type { ConfidenceMessage } from "@/lib/ai-pm-types";

/** Founder Confidence Engine — Rule 8 */
export function AiPmConfidence({ message }: { message: ConfidenceMessage }) {
  return (
    <section className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
        AI PM 확신
      </p>
      <p className="mt-3 whitespace-pre-line text-base font-medium leading-relaxed">
        {message.headline}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">{message.body}</p>
      <div className="mt-4 inline-flex rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-300">
        지금 가장 중요한 것: {message.priority}
      </div>
    </section>
  );
}
