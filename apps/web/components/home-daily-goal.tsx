"use client";

import { getTodayPlayCount, getServerTodayPlayCountSnapshot, subscribeEngagement } from "@game-platform/game-sdk";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { filterPlayHistory, getPlayHistorySnapshot, getServerPlayHistorySnapshot, formatDuration, subscribePlayHistory } from "@/lib/play-history";
import { useMounted } from "@/lib/use-mounted";

const GOAL_SEC = 5 * 60;

export function HomeDailyGoal() {
  const mounted = useMounted();
  const todayPlays = useSyncExternalStore(
    subscribeEngagement,
    getTodayPlayCount,
    getServerTodayPlayCountSnapshot
  );
  const history = useSyncExternalStore(
    subscribePlayHistory,
    getPlayHistorySnapshot,
    getServerPlayHistorySnapshot
  );

  const todaySec = filterPlayHistory(history, "today").reduce(
    (s, e) => s + e.durationSec,
    0
  );
  const pct = Math.min(100, Math.round((todaySec / GOAL_SEC) * 100));
  const done = todaySec >= GOAL_SEC;

  return (
    <section className="py-3">
      <Container>
        <Link
          href="/journey"
          className="block rounded-2xl border border-white/10 bg-card/50 p-4 shadow-sm backdrop-blur transition-colors hover:border-primary/30"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">오늘의 목표 · 5분 플레이</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {mounted
                  ? done
                    ? "목표 달성!"
                    : `${formatDuration(todaySec)} / 5분 · ${todayPlays}회`
                  : "—"}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-sm font-bold tabular-nums">
              {mounted ? `${pct}%` : "—"}
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: mounted ? `${pct}%` : "0%" }}
            />
          </div>
        </Link>
      </Container>
    </section>
  );
}
