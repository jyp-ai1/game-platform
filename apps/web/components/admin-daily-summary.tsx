import Link from "next/link";

import { buildAiPmSession } from "@/lib/ai-pm-engine";

/** Compact AI PM briefing card for /admin/os — links to full experience */
export function AdminDailySummary() {
  const session = buildAiPmSession();
  const { hero, briefing } = session;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">AI PM Briefing</p>
          <h2 className="font-semibold">오늘 {hero.minutesNeeded}분 · {hero.beforePercent}% → {hero.afterPercent}%</h2>
        </div>
        <Link
          href="/admin/pm"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          AI PM과 함께 →
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BriefCard
          title="좋은 소식"
          body={briefing.goodNews}
          accent="emerald"
        />
        <BriefCard
          title="가장 큰 리스크"
          body={briefing.biggestRisk}
          accent="amber"
        />
        <BriefCard
          title="오늘 추천"
          body={`${hero.recommendedAction}\n\n예상 ${hero.minutesNeeded}분`}
          accent="violet"
          ctaHref={hero.ctaHref}
          ctaLabel={hero.ctaLabel}
        />
      </div>
    </section>
  );
}

function BriefCard({
  title,
  body,
  accent,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  accent: "emerald" | "amber" | "violet";
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const border =
    accent === "emerald"
      ? "border-emerald-500/25 bg-emerald-500/5"
      : accent === "amber"
        ? "border-amber-500/25 bg-amber-500/5"
        : "border-violet-500/25 bg-violet-500/5";

  return (
    <div className={`rounded-2xl border p-5 ${border}`}>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{body}</p>
      {ctaHref && ctaLabel ? (
        <Link href={ctaHref} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          {ctaLabel} →
        </Link>
      ) : null}
    </div>
  );
}
