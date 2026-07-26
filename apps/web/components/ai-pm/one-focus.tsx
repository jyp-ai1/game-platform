"use client";

import type { OneFocus } from "@/lib/company-os-types";
import Link from "next/link";

/** One Focus Rule — exactly ONE recommendation */
export function OneFocusPanel({
  focus,
  onStart,
  completed,
}: {
  focus: OneFocus;
  onStart?: () => void;
  completed?: boolean;
}) {
  return (
    <section className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        오늘 가장 중요한 일 · 단 하나
      </p>
      <h2 className="mt-3 text-xl font-bold leading-snug sm:text-2xl">{focus.title}</h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Fact label="예상" value={`${focus.minutes}분`} />
        <Fact label="효과" value={focus.expectedEffect} />
        <Fact label="성공 지표" value={focus.successMetric} />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{focus.rationale}</p>

      {completed ? (
        <p className="mt-6 rounded-xl bg-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-300">
          ✓ 오늘 목표 완료
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={focus.ctaHref}
            onClick={onStart}
            className="inline-flex rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg"
          >
            {focus.ctaLabel} →
          </Link>
          <button
            type="button"
            onClick={onStart}
            className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium hover:bg-white/5"
          >
            완료 표시
          </button>
        </div>
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
