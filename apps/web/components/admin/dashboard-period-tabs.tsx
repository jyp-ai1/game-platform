"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const PERIODS = [
  { id: "today", label: "오늘" },
  { id: "week", label: "이번주" },
  { id: "month", label: "이번달" },
  { id: "all", label: "전체" },
] as const;

export type DashboardPeriod = (typeof PERIODS)[number]["id"];

export function DashboardPeriodTabs({ current }: { current: DashboardPeriod }) {
  const searchParams = useSearchParams();

  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {PERIODS.map((p) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("period", p.id);
        const active = current === p.id;
        return (
          <Link
            key={p.id}
            href={`/admin?${params.toString()}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
