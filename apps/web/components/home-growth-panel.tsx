"use client";

import {
  getDailyMission,
  getDailyStreak,
  getLevelProgress,
  getMissionDefinition,
  getServerDailyMissionSnapshot,
  getServerDailyStreakSnapshot,
  getServerLevelProgressSnapshot,
  isDailyChallengeComplete,
  subscribeEngagement,
  subscribeMissions,
} from "@game-platform/game-sdk";
import { Container, Progress } from "@game-platform/ui";
import { Flame, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { useMounted } from "@/lib/use-mounted";

export function HomeGrowthPanel() {
  const mounted = useMounted();
  const mission = useSyncExternalStore(
    subscribeMissions,
    getDailyMission,
    getServerDailyMissionSnapshot
  );
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

  const dailyComplete = mission.date ? isDailyChallengeComplete(mission) : false;
  const dailyXp = mission.missionIds.reduce(
    (sum, id) => sum + (getMissionDefinition(id)?.xp ?? 0),
    0
  );

  return (
    <section className="border-b py-8 sm:py-10">
      <Container>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/journey"
            className="rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">오늘의 도전</span>
            </div>
            <p className="mt-3 text-lg font-semibold">
              {mounted && mission.date
                ? dailyComplete
                  ? "오늘 미션 완료!"
                  : `미션 ${mission.completed.length}/${mission.missionIds.length}`
                : "미션 불러오는 중"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {mounted && dailyXp > 0 ? `+${dailyXp} XP 보상` : "플레이하고 XP를 모으세요"}
            </p>
          </Link>

          <Link
            href="/profile"
            className="rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-2 text-primary">
              <Trophy className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">내 성장</span>
            </div>
            {mounted ? (
              <>
                <p className="mt-3 text-lg font-semibold tabular-nums">Lv.{level.level}</p>
                <Progress value={level.percent} label="레벨 진행률" className="mt-2" />
              </>
            ) : (
              <p className="mt-3 text-lg font-semibold">Lv.1</p>
            )}
          </Link>

          <Link
            href="/profile"
            className="rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-2 text-primary">
              <Flame className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">연속 출석</span>
            </div>
            <p className="mt-3 text-lg font-semibold tabular-nums">
              {mounted ? `${streak.currentStreak}일` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">매일 플레이하고 streak을 유지하세요</p>
          </Link>
        </div>
      </Container>
    </section>
  );
}
