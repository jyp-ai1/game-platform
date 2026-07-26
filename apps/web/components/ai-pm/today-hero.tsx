"use client";

import type { TodayHero } from "@/lib/ai-pm-types";
import Link from "next/link";

/** Today Hero 2.0 — time · reason · effect · action · Start (Rule 5) */
export function AiPmTodayHero({ hero }: { hero: TodayHero }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8">
      <p className="text-sm font-medium text-primary">AI PM · 오늘의 추천</p>
      <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
        오늘 {hero.minutesNeeded}분 투자하면
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        사업 완성도가{" "}
        <span className="font-bold text-foreground">{hero.beforePercent}%</span>
        {" → "}
        <span className="font-bold text-primary">{hero.afterPercent}%</span>
        까지 올라갑니다.
      </p>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all"
          style={{ width: `${hero.beforePercent}%` }}
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <HeroFact label="오늘 필요한 시간" value={`${hero.minutesNeeded}분`} />
        <HeroFact label="오늘 해야 하는 이유" value={hero.reason} />
        <HeroFact label="기대 효과" value={hero.expectedEffect} />
        <HeroFact label="추천 행동" value={hero.recommendedAction} />
      </div>

      <Link
        href={hero.ctaHref}
        className="mt-6 inline-flex rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
      >
        {hero.ctaLabel} →
      </Link>
    </section>
  );
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium leading-snug">{value}</p>
    </div>
  );
}
