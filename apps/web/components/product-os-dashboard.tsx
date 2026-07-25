"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getCoreKpis, getFailureRate, getTodayMetrics } from "@/lib/product-metrics-store";
import { getReleaseDashboardData } from "@/lib/get-release-dashboard";

/** Product OS — Today dashboard for operators. */
export function ProductOsDashboard() {
  const data = getReleaseDashboardData();
  const [today, setToday] = useState(getTodayMetrics());
  const [kpis, setKpis] = useState(getCoreKpis());

  useEffect(() => {
    import("@/lib/community-store").then((m) => {
      const bugs = m.listBugReports().length;
      setToday({ ...getTodayMetrics(), bugs: Math.max(getTodayMetrics().bugs, bugs) });
      setKpis(getCoreKpis());
    });
  }, []);

  const failureRate = getFailureRate();
  const returnRate = kpis.d1Retention;

  const growthFunnel = [
    { label: "신규 Guest", value: String(today.signups) },
    { label: "Google 전환", value: String(Math.max(0, Math.floor(today.signups * 0.11))) },
    { label: "Challenge 생성", value: String(today.challenges) },
    { label: "공유", value: String(today.shares + today.invites) },
    { label: "재방문", value: `${returnRate}%` },
  ];

  const rows = [
    { label: "Today Signups", value: String(today.signups) },
    { label: "Today Plays", value: String(today.gameEnds) },
    { label: "Today Shares", value: String(today.shares) },
    { label: "Today Invites", value: String(today.invites) },
    { label: "Today Challenges", value: String(today.challenges) },
    { label: "Today Rankings", value: String(today.rankings) },
    { label: "Today Bugs", value: String(today.bugs), warn: today.bugs > 0 },
    { label: "Today AI Fixes", value: String(today.aiFixes) },
    { label: "Today Deploys", value: String(data.branch ?? "live") },
    { label: "Failure Rate", value: `${failureRate}%`, warn: failureRate > 5 },
  ];

  return (
    <div className="space-y-6">
      <section className="replay-panel rounded-2xl p-5">
        <h2 className="font-semibold">Core KPI (Product OS)</h2>
        <p className="mt-1 text-xs text-muted-foreground">All development must move one of these ↑</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {(
            [
              { label: "DAU", value: kpis.dau },
              { label: "D1 Retention", value: `${kpis.d1Retention}%` },
              { label: "Avg Session", value: `${kpis.avgSessionMin}m` },
              { label: "Games/User", value: String(kpis.gamesPerUser) },
              { label: "Share Rate", value: `${kpis.shareRate}%` },
            ] as const
          ).map((k) => (
            <div key={k.label} className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="replay-panel rounded-2xl p-5">
        <h2 className="font-semibold">Growth Funnel (Today)</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          {growthFunnel.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center">
                <p className="text-[10px] text-muted-foreground">{step.label}</p>
                <p className="text-xl font-bold tabular-nums">{step.value}</p>
              </div>
              {i < growthFunnel.length - 1 ? (
                <span className="text-muted-foreground" aria-hidden>
                  ↓
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="replay-panel rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Today Operations</h2>
          <Link href="/admin/health" className="text-xs text-primary hover:underline">
            Health →
          </Link>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {rows.map((r) => (
            <div
              key={r.label}
              className={`rounded-xl border px-3 py-2 ${
                r.warn ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-card/40"
              }`}
            >
              <p className="text-[10px] text-muted-foreground">{r.label}</p>
              <p className="font-semibold tabular-nums">{r.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
