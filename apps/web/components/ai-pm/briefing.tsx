"use client";

import type { BriefingBeat } from "@/lib/ai-pm-types";
import Link from "next/link";

/** Analysis Completion — briefing not report (Rule 4) */
export function AiPmBriefing({ briefing }: { briefing: BriefingBeat }) {
  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-6 sm:p-8">
      <p className="whitespace-pre-line text-lg font-medium leading-relaxed">
        {briefing.greeting}
      </p>

      <div className="mt-6 space-y-4">
        <BriefingBlock title="시장 검토 결과" body={briefing.goodNews} accent="emerald" />
        <BriefingBlock title="가장 큰 리스크" body={briefing.biggestRisk} accent="amber" />
        <BriefingBlock
          title="오늘 추천"
          body={`${briefing.todayRecommendation}\n\n예상 ${briefing.minutesNeeded}분 · ${briefing.expectedEffect}`}
          accent="primary"
        />
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-sm text-muted-foreground">
          오늘은 <span className="font-bold text-foreground">{briefing.minutesNeeded}분</span>
          만 투자하면 됩니다.
        </p>
      </div>

      <Link
        href={briefing.ctaHref}
        className="mt-6 inline-flex rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-500"
      >
        {briefing.ctaLabel} →
      </Link>
    </section>
  );
}

function BriefingBlock({
  title,
  body,
  accent,
}: {
  title: string;
  body: string;
  accent: "emerald" | "amber" | "primary";
}) {
  const border =
    accent === "emerald"
      ? "border-emerald-500/20"
      : accent === "amber"
        ? "border-amber-500/20"
        : "border-primary/20";
  return (
    <div className={`rounded-xl border ${border} bg-card/50 p-4`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{body}</p>
    </div>
  );
}
