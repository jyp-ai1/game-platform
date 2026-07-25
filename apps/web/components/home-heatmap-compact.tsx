"use client";

import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import {
  filterPlayHistory,
  getPlayHistorySnapshot,
  getServerPlayHistorySnapshot,
  subscribePlayHistory,
} from "@/lib/play-history";

export function HomeHeatmapCompact() {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const history = useSyncExternalStore(
    subscribePlayHistory,
    getPlayHistorySnapshot,
    getServerPlayHistorySnapshot
  );

  const cells = useMemo(() => {
    const month = filterPlayHistory(history, "month");
    const byDay = new Map<string, number>();
    for (const entry of month) {
      const day = entry.startedAt.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const days: { key: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, count: byDay.get(key) ?? 0 });
    }
    return days;
  }, [history]);

  const max = Math.max(1, ...cells.map((c) => c.count));

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Play Heatmap</h3>
        <Link href="/library" className="text-xs text-primary hover:underline">
          Library →
        </Link>
      </div>
      <div className="mt-3 flex gap-1">
        {cells.map((c) => (
          <div
            key={c.key}
            title={`${c.key}: ${c.count}`}
            className="h-8 flex-1 rounded-sm transition-colors"
            style={{
              backgroundColor:
                c.count === 0
                  ? "hsl(var(--muted))"
                  : `hsl(var(--primary) / ${0.25 + (c.count / max) * 0.75})`,
            }}
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Last 14 days</p>
    </section>
  );
}
