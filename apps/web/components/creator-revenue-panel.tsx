"use client";

import { getCreatorRevenue } from "@/lib/creator/creator-revenue";

export function CreatorRevenuePanel() {
  const revenue = getCreatorRevenue();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="text-sm text-muted-foreground">Creator 수익 공유 {revenue.sharePercent}% (장기)</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">Total Earned</p>
          <p className="mt-1 text-2xl font-bold">${revenue.totalEarned}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">Pending Payout</p>
          <p className="mt-1 text-2xl font-bold">${revenue.pendingPayout}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {revenue.options.map((opt) => (
          <div key={opt.id} className="rounded-2xl border border-white/10 bg-card/40 p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{opt.label}</p>
              <span className={`text-xs ${opt.enabled ? "text-emerald-400" : "text-muted-foreground"}`}>
                {opt.enabled ? "Active" : "Coming soon"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{opt.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
