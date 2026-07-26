"use client";

import type { CompanyTimelineEvent } from "@/lib/company-os-types";

const KIND_LABEL: Record<CompanyTimelineEvent["kind"], string> = {
  deploy: "배포",
  feature: "기능",
  kpi: "KPI",
  feedback: "피드백",
  decision: "결정",
};

/** Company Timeline — growth story accumulation */
export function CompanyTimelinePanel({ events }: { events: CompanyTimelineEvent[] }) {
  if (!events.length) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Company Timeline
      </p>
      <ol className="mt-4 space-y-3">
        {events.slice(0, 8).map((ev) => (
          <li key={ev.id} className="flex gap-3 text-sm">
            <span className="shrink-0 text-xs text-muted-foreground">{ev.date.slice(5)}</span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              {KIND_LABEL[ev.kind]}
            </span>
            <span>
              {ev.title}
              {ev.detail ? (
                <span className="text-muted-foreground"> · {ev.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
