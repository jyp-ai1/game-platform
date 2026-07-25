"use client";

import {
  subscribeEngagement,
  subscribeMissions,
  subscribeWeeklyMission,
  getDailyMission,
  getWeeklyMission,
  getServerDailyMissionSnapshot,
  getServerWeeklyMissionSnapshot,
  getMissionDefinition,
  getWeeklyMissionDefinition,
  isDailyChallengeComplete,
  isWeeklyMissionComplete,
  getDailyStreak,
  getServerDailyStreakSnapshot,
} from "@game-platform/game-sdk";
import { Container, Progress } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";

export function MissionHub() {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const daily = useSyncExternalStore(subscribeMissions, getDailyMission, getServerDailyMissionSnapshot);
  const weekly = useSyncExternalStore(subscribeWeeklyMission, getWeeklyMission, getServerWeeklyMissionSnapshot);
  const streak = useSyncExternalStore(subscribeEngagement, getDailyStreak, getServerDailyStreakSnapshot);

  const dailyPct =
    daily.missionIds.length > 0
      ? (daily.completed.length / daily.missionIds.length) * 100
      : 0;
  const weeklyDef = weekly.week ? getWeeklyMissionDefinition(weekly.missionId) : null;
  const weeklyPct =
    weekly.progress?.target > 0
      ? (weekly.progress.current / weekly.progress.target) * 100
      : 0;

  const missions = [
    {
      title: "Daily",
      desc: `${daily.completed.length}/${daily.missionIds.length} tasks`,
      pct: dailyPct,
      done: isDailyChallengeComplete(daily),
      xp: daily.missionIds.reduce((s, id) => s + (getMissionDefinition(id)?.xp ?? 0), 0),
      href: "/",
    },
    weeklyDef
      ? {
          title: "Weekly",
          desc: weeklyDef.title,
          pct: weeklyPct,
          done: isWeeklyMissionComplete(weekly),
          xp: weeklyDef.xp,
          href: weeklyDef.linkHref,
        }
      : null,
    {
      title: "Monthly",
      desc: "Play 20 different games",
      pct: Math.min(100, streak.currentStreak * 5),
      done: false,
      xp: 500,
      href: "/library",
    },
    {
      title: "Season",
      desc: "Season pass progress",
      pct: 35,
      done: false,
      xp: 1000,
      href: "/profile",
    },
  ].filter(Boolean) as Array<{
    title: string;
    desc: string;
    pct: number;
    done: boolean;
    xp: number;
    href: string;
  }>;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Mission Hub</p>
        <p className="mt-1 text-2xl font-bold">Daily · Weekly · Monthly · Season</p>
        <p className="mt-1 text-sm text-muted-foreground">{streak.currentStreak} day streak active</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {missions.map((m) => (
          <Link
            key={m.title}
            href={m.href}
            className="rounded-2xl border border-white/10 bg-card/60 p-5 backdrop-blur transition-colors hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{m.title}</h3>
              <span className="text-xs text-primary">{m.done ? "Done ✓" : `+${m.xp} XP`}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
            {!m.done ? <Progress value={m.pct} className="mt-4" label={`${m.title} progress`} /> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
