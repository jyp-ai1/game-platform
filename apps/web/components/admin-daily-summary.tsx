import Link from "next/link";

import { buildCeoOfficeSession } from "@/lib/company-os-engine";

/** Compact CEO Office summary for /admin/os */
export function AdminDailySummary() {
  const session = buildCeoOfficeSession();
  const { oneFocus, pillars, morningGreeting } = session;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">AI CEO Office</p>
          <h2 className="font-semibold">
            {morningGreeting} · {oneFocus.minutes}분 · {session.companyCompleteness}%
          </h2>
        </div>
        <Link
          href="/admin/pm"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          CEO Office →
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        {pillars.map((p) => (
          <span key={p.pillar} className="rounded-lg border border-white/10 px-3 py-1.5">
            {p.label} · {p.statusLabel}
          </span>
        ))}
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase text-primary">오늘 가장 중요한 일</p>
        <p className="mt-2 font-medium">{oneFocus.title}</p>
        <Link href="/admin/pm" className="mt-3 inline-block text-sm text-primary hover:underline">
          {oneFocus.ctaLabel} →
        </Link>
      </div>
    </section>
  );
}
