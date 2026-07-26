"use client";

import type { CompanyPillarStatus } from "@/lib/company-os-types";

function Stars({ count }: { count: number }) {
  return (
    <span className="text-amber-400 tracking-tight" aria-label={`${count} stars`}>
      {"★".repeat(count)}
      <span className="text-muted-foreground/30">{"★".repeat(5 - count)}</span>
    </span>
  );
}

/** Company Status — Founder sees company health first */
export function CompanyStatusPanel({
  greeting,
  pillars,
}: {
  greeting: string;
  pillars: CompanyPillarStatus[];
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8">
      <p className="text-lg font-medium">{greeting}</p>
      <h1 className="mt-2 text-xl font-bold sm:text-2xl">오늘 회사 상태입니다.</h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((p) => (
          <div
            key={p.pillar}
            className="rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <Stars count={p.stars} />
            <p className="mt-2 font-semibold">{p.label}</p>
            <p
              className={`mt-1 text-sm ${
                p.trend === "up"
                  ? "text-emerald-400"
                  : p.trend === "down"
                    ? "text-amber-400"
                    : "text-muted-foreground"
              }`}
            >
              {p.statusLabel}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
