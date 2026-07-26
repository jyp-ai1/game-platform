"use client";

import type { ThinkingStep } from "@/lib/ai-pm-types";
import { cn } from "@game-platform/ui";

/** AI Thinking Timeline — Rule 7: why / founder value / ETA always visible */
export function AiPmThinkingTimeline({ steps }: { steps: ThinkingStep[] }) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-card/80 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        AI PM Thinking Timeline
      </h2>
      <ol className="mt-6 space-y-0">
        {steps.map((step, i) => (
          <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {i < steps.length - 1 ? (
              <span className="absolute left-[11px] top-6 h-full w-px bg-border" aria-hidden />
            ) : null}
            <StepDot status={step.status} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{step.label}</p>
                <StatusBadge status={step.status} />
                <span className="text-xs text-muted-foreground">예상 {step.etaSeconds}초</span>
              </div>
              <div className="mt-2 space-y-2 rounded-xl border border-white/5 bg-muted/30 p-3 text-sm">
                <p>
                  <span className="font-medium text-primary">왜 하나요?</span>
                  <br />
                  <span className="text-muted-foreground">{step.why}</span>
                </p>
                <p>
                  <span className="font-medium text-emerald-400">Founder 가치</span>
                  <br />
                  <span className="text-muted-foreground">{step.founderValue}</span>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepDot({ status }: { status: ThinkingStep["status"] }) {
  return (
    <span
      className={cn(
        "relative z-10 mt-1 size-[22px] shrink-0 rounded-full border-2",
        status === "done" && "border-emerald-500 bg-emerald-500",
        status === "running" && "border-primary bg-primary/30 animate-pulse",
        status === "pending" && "border-muted-foreground/40 bg-muted"
      )}
      aria-hidden
    />
  );
}

function StatusBadge({ status }: { status: ThinkingStep["status"] }) {
  const label =
    status === "done" ? "완료" : status === "running" ? "진행중" : "예정";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
        status === "done" && "bg-emerald-500/20 text-emerald-400",
        status === "running" && "bg-primary/20 text-primary",
        status === "pending" && "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}
