"use client";

import {
  getDailyMission,
  getMissionDefinition,
  getServerDailyMissionSnapshot,
  getTodayPlayCount,
  getServerTodayPlayCountSnapshot,
  isDailyChallengeComplete,
  subscribeEngagement,
  subscribeMissions,
} from "@game-platform/game-sdk";
import { Container } from "@game-platform/ui";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  filterPlayHistory,
  formatDuration,
  getPlayHistorySnapshot,
  getServerPlayHistorySnapshot,
  subscribePlayHistory,
} from "@/lib/play-history";
import { useMounted } from "@/lib/use-mounted";

const GOAL_SEC = 5 * 60;

export function HomeDailyChallengeStrip() {
  const mounted = useMounted();
  const mission = useSyncExternalStore(
    subscribeMissions,
    getDailyMission,
    getServerDailyMissionSnapshot
  );
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

  if (!mounted || !mission.date) return null;

  const complete = isDailyChallengeComplete(mission);
  const dailyXp = mission.missionIds.reduce(
    (sum, id) => sum + (getMissionDefinition(id)?.xp ?? 0),
    0
  );
  const todaySec = filterPlayHistory(history, "today").reduce(
    (s, e) => s + e.durationSec,
    0
  );
  const goalPct = Math.min(100, Math.round((todaySec / GOAL_SEC) * 100));

  return (
    <section className="py-4 sm:py-6">
      <Container>
        <Link
          href="/library"
          className="block rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card/80 to-card/60 p-6 shadow-lg shadow-primary/5 backdrop-blur transition-colors hover:border-primary/40 sm:p-8"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20">
                <Sparkles className="size-7 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold sm:text-2xl">Daily Challenge</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {complete
                    ? "Done"
                    : `${mission.completed.length}/${mission.missionIds.length}`}
                  {dailyXp > 0 ? ` · +${dailyXp} XP` : ""}
                  {todayPlays > 0 ? ` · ${todayPlays} plays` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-3xl font-bold tabular-nums text-primary">{goalPct}%</p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(todaySec)} / 5m
                </p>
              </div>
              <div className="h-16 w-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="w-full rounded-full bg-primary transition-all"
                  style={{ height: `${goalPct}%`, marginTop: `${100 - goalPct}%` }}
                />
              </div>
            </div>
          </div>
        </Link>
      </Container>
    </section>
  );
}
