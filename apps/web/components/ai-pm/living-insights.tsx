"use client";

import type { LivingInsight } from "@/lib/company-os-types";
import { cn } from "@game-platform/ui";

/** Living Company — daily different insights with cause & suggestion */
export function LivingInsightsPanel({ insights }: { insights: LivingInsight[] }) {
  return (
    <section className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        오늘 핵심 변화
      </p>
      {insights.map((insight) => (
        <div
          key={insight.id}
          className={cn(
            "rounded-xl border p-4 text-sm leading-relaxed",
            insight.trend === "up" && "border-emerald-500/20 bg-emerald-500/5",
            insight.trend === "down" && "border-amber-500/20 bg-amber-500/5",
            insight.trend === "stable" && "border-white/10 bg-muted/20"
          )}
        >
          <p className="font-medium">{insight.message}</p>
          {insight.cause ? (
            <p className="mt-2 text-muted-foreground">{insight.cause}</p>
          ) : null}
          {insight.suggestion ? (
            <p className="mt-2 text-primary">{insight.suggestion}</p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
