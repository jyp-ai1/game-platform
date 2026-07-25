"use client";

import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useMemo } from "react";
import { useSyncExternalStore } from "react";

import {
  filterPlayHistory,
  getPlayHistorySnapshot,
  getServerPlayHistorySnapshot,
  subscribePlayHistory,
} from "@/lib/play-history";

export function JourneyHeatMap() {
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
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, count: byDay.get(key) ?? 0 });
    }
    return days;
  }, [history]);

  const max = Math.max(1, ...cells.map((c) => c.count));

  return (
    <section className="rounded-3xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Play Calendar</h3>
        <Link href="/journey" className="text-xs text-primary hover:underline">
          Journey →
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-10 gap-1">
        {cells.map((cell) => (
          <div
            key={cell.key}
            title={cell.key}
            className="aspect-square rounded-sm"
            style={{
              backgroundColor: `color-mix(in srgb, var(--primary) ${Math.round((cell.count / max) * 100)}%, transparent)`,
            }}
          />
        ))}
      </div>
    </section>
  );
}

export function JourneyMonthlyReport() {
  const history = useSyncExternalStore(
    subscribePlayHistory,
    getPlayHistorySnapshot,
    getServerPlayHistorySnapshot
  );
  const monthSec = filterPlayHistory(history, "month").reduce(
    (s, e) => s + e.durationSec,
    0
  );
  const hours = Math.round(monthSec / 3600);

  return (
    <Container className="py-4">
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 to-card p-6">
        <p className="text-xs uppercase tracking-widest text-primary">Monthly</p>
        <p className="mt-2 text-3xl font-bold">{hours}h</p>
        <p className="text-sm text-muted-foreground">This month on Re:Play</p>
      </div>
    </Container>
  );
}
