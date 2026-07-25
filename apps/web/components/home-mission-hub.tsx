"use client";

import {
  getDailyMission,
  getMissionDefinition,
  getServerDailyMissionSnapshot,
  getServerWeeklyMissionSnapshot,
  getWeeklyMission,
  getWeeklyMissionDefinition,
  isDailyChallengeComplete,
  isWeeklyMissionComplete,
  subscribeMissions,
  subscribeWeeklyMission,
} from "@game-platform/game-sdk";
import { Container, Progress } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { useMounted } from "@/lib/use-mounted";

export function HomeMissionHub() {
  const mounted = useMounted();
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const daily = useSyncExternalStore(
    subscribeMissions,
    getDailyMission,
    getServerDailyMissionSnapshot
  );
  const weekly = useSyncExternalStore(
    subscribeWeeklyMission,
    getWeeklyMission,
    getServerWeeklyMissionSnapshot
  );

  if (!mounted || !daily.date) return null;

  const dailyDone = isDailyChallengeComplete(daily);
  const dailyPct =
    daily.missionIds.length > 0
      ? (daily.completed.length / daily.missionIds.length) * 100
      : 0;
  const dailyXp = daily.missionIds.reduce(
    (s, id) => s + (getMissionDefinition(id)?.xp ?? 0),
    0
  );

  const weeklyDef = weekly.week ? getWeeklyMissionDefinition(weekly.missionId) : null;
  const weeklyDone = weekly.week ? isWeeklyMissionComplete(weekly) : false;
  const weeklyPct =
    weekly.progress && weekly.progress.target > 0
      ? (weekly.progress.current / weekly.progress.target) * 100
      : 0;

  return (
    <section className="py-4">
      <Container>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/profile"
            className="rounded-2xl border border-primary/20 bg-card/60 p-4 backdrop-blur transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">Daily Mission</p>
              <span className="text-xs text-primary">{dailyDone ? "Complete" : `+${dailyXp} XP`}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {daily.completed.length}/{daily.missionIds.length} tasks
            </p>
            {!dailyDone ? <Progress value={dailyPct} className="mt-3" label="Daily mission" /> : null}
          </Link>

          {weeklyDef ? (
            <Link
              href="/profile"
              className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur transition-colors hover:border-primary/30"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">Weekly Goal</p>
                <span className="text-xs text-muted-foreground">
                  {weeklyDone ? "Done" : `${weekly.progress.current}/${weekly.progress.target}`}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{weeklyDef.title}</p>
              {!weeklyDone ? (
                <Progress value={weeklyPct} className="mt-3" label="Weekly mission" />
              ) : null}
            </Link>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
