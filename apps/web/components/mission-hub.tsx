"use client";

import {
  subscribeEngagement,
  subscribeWeeklyMission,
  getWeeklyMission,
  getServerWeeklyMissionSnapshot,
  getWeeklyMissionDefinition,
  isWeeklyMissionComplete,
  getDailyStreak,
  getServerDailyStreakSnapshot,
} from "@game-platform/game-sdk";
import { Progress } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { AttendanceCalendar } from "@/components/attendance-calendar";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { buildTodayReason } from "@/lib/today-reason";
import {
  getDailyMission,
  getServerDailyMissionSnapshot,
  subscribeMissions,
} from "@game-platform/game-sdk";
import {
  getTodayMissionMix,
  getTodayMissionProgress,
  isTodayMissionMixComplete,
} from "@/lib/universal-mission-engine";
import type { Game } from "@game-platform/shared";

export function MissionHub({ games = [] }: { games?: Game[] }) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  useSyncExternalStore(subscribeMissions, getDailyMission, getServerDailyMissionSnapshot);
  const weekly = useSyncExternalStore(subscribeWeeklyMission, getWeeklyMission, getServerWeeklyMissionSnapshot);
  const streak = useSyncExternalStore(subscribeEngagement, getDailyStreak, getServerDailyStreakSnapshot);

  const reason = typeof window !== "undefined" ? buildTodayReason(games) : null;
  const mix = typeof window !== "undefined" ? getTodayMissionMix() : [];
  const progress = typeof window !== "undefined" ? getTodayMissionProgress() : { done: 0, total: 0, pct: 0 };
  const dailyDone = typeof window !== "undefined" ? isTodayMissionMixComplete() : false;

  const weeklyDef = weekly.week ? getWeeklyMissionDefinition(weekly.missionId) : null;
  const weeklyPct =
    weekly.progress?.target > 0 ? (weekly.progress.current / weekly.progress.target) * 100 : 0;

  return (
    <div className="flex flex-col gap-8">
      {reason ? (
        <Link
          href={reason.href}
          className="block rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 to-card p-6 transition-colors hover:border-primary/40"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">오늘 플레이 이유</p>
          <p className="mt-2 text-2xl font-bold">{reason.headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{reason.subline}</p>
          <p className="mt-2 text-sm font-medium text-amber-400">{reason.rewardHint}</p>
        </Link>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-card/60 p-6">
        <div className="flex items-center justify-between">
          <p className="font-semibold">오늘 미션 {progress.done}/{progress.total}</p>
          <span className="text-xs text-primary">{dailyDone ? "완료 ✓" : `+${(progress.total - progress.done) * 30} XP`}</span>
        </div>
        {!dailyDone ? <Progress value={progress.pct} className="mt-4" label="Daily mission" /> : null}
        <ul className="mt-4 space-y-2">
          {mix.map((m) => (
            <li key={m.id}>
              <Link
                href={m.href}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors hover:border-primary/30 ${
                  m.done ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10"
                }`}
              >
                <span>{m.done ? "✓" : "○"} {m.label}</span>
                {!m.done ? <span className="text-primary">Play →</span> : null}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">{streak.currentStreak}일 streak · 완료 시 +100 Coin</p>
      </div>

      <AttendanceCalendar />

      {weeklyDef ? (
        <Link
          href={weeklyDef.linkHref}
          className="block rounded-2xl border border-white/10 bg-card/60 p-5 transition-colors hover:border-primary/30"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Weekly</h3>
            <span className="text-xs text-muted-foreground">
              {isWeeklyMissionComplete(weekly) ? "Done ✓" : `${weekly.progress.current}/${weekly.progress.target}`}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{weeklyDef.title}</p>
          {!isWeeklyMissionComplete(weekly) ? (
            <Progress value={weeklyPct} className="mt-4" label="Weekly mission" />
          ) : null}
        </Link>
      ) : null}
    </div>
  );
}
