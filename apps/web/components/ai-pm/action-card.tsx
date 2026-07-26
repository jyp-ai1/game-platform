"use client";

import type { ActionProposal } from "@/lib/ai-pm-types";
import Link from "next/link";

/** Action First — every screen ends with CTA (Rule 9) */
export function AiPmActionCard({ action }: { action: ActionProposal }) {
  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        다음 추천 행동
      </p>
      <p className="mt-3 text-lg font-semibold leading-snug">{action.title}</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <span className="rounded-lg bg-black/20 px-3 py-1.5">
          예상 <strong>{action.minutes}분</strong>
        </span>
        <span className="rounded-lg bg-black/20 px-3 py-1.5 text-muted-foreground">
          {action.expectedEffect}
        </span>
      </div>
      <Link
        href={action.ctaHref}
        className="mt-5 inline-flex rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground"
      >
        {action.ctaLabel} →
      </Link>
    </section>
  );
}
