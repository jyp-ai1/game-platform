"use client";

import {
  getDailyStreak,
  getLevelProgress,
  getServerDailyStreakSnapshot,
  getServerLevelProgressSnapshot,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import { Container } from "@game-platform/ui";
import { Flame, Trophy } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { useMounted } from "@/lib/use-mounted";

/** Compact growth strip — belongs lower on Home; deep stats live on Journey. */
export function HomeGrowthPanel() {
  const mounted = useMounted();
  const streak = useSyncExternalStore(
    subscribeEngagement,
    getDailyStreak,
    getServerDailyStreakSnapshot
  );
  const level = useSyncExternalStore(
    subscribeEngagement,
    getLevelProgress,
    getServerLevelProgressSnapshot
  );

  return (
    <section className="border-b py-4 sm:py-5">
      <Container>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">My Growth</p>
          <Link href="/journey" className="text-xs text-primary hover:underline">
            Journey에서 자세히 →
          </Link>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2.5 text-sm transition-colors hover:border-primary/40"
          >
            <Trophy className="size-4 text-primary" />
            <span>{mounted ? `Lv.${level.level}` : "Lv.1"}</span>
          </Link>
          <Link
            href="/journey"
            className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2.5 text-sm transition-colors hover:border-primary/40"
          >
            <Flame className="size-4 text-primary" />
            <span>{mounted ? `${streak.currentStreak}일 streak` : "—"}</span>
          </Link>
          <Link
            href="/journey"
            className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-dashed bg-card/30 px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 sm:col-span-1"
          >
            통계 · 타임라인
          </Link>
        </div>
      </Container>
    </section>
  );
}
