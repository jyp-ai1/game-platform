"use client";

import {
  getAchievements,
  getDailyMission,
  getDailyStreak,
  getLevelProgress,
  getServerAchievementsSnapshot,
  getServerDailyMissionSnapshot,
  getServerDailyStreakSnapshot,
  getServerLevelProgressSnapshot,
  isDailyChallengeComplete,
  subscribeEngagement,
  subscribeMissions,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import { Coins, Flame, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { getCoins, getServerCoinsSnapshot, subscribeCoins } from "@/lib/coins";
import { getCompleted } from "@/lib/library-store";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { replayScoreTier } from "@/lib/replay-score";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import { useMounted } from "@/lib/use-mounted";

export function HomeIdentityDashboard({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const coins = useSyncExternalStore(subscribeCoins, getCoins, getServerCoinsSnapshot);
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
  const mission = useSyncExternalStore(
    subscribeMissions,
    getDailyMission,
    getServerDailyMissionSnapshot
  );
  const achievements = useSyncExternalStore(
    subscribeEngagement,
    getAchievements,
    getServerAchievementsSnapshot
  );

  const replayScore = useMemo(() => {
    if (!mounted) return 0;
    return buildWrappedSnapshot(games).replayScore;
  }, [games, mounted, achievements, streak, coins]);

  const tier = replayScoreTier(replayScore);
  const missionPct =
    mission.missionIds.length > 0
      ? Math.round((mission.completed.length / mission.missionIds.length) * 100)
      : 0;
  const missionDone = isDailyChallengeComplete(mission);
  const collectionCount = mounted ? getCompleted().length : 0;

  const stats = [
    {
      href: "/profile",
      icon: Trophy,
      label: "Level",
      value: mounted ? `Lv.${level.level}` : "—",
      sub: `${level.xpIntoLevel}/${level.xpNeededForLevel} XP`,
    },
    {
      href: "/profile",
      icon: Coins,
      label: "Coins",
      value: mounted ? coins.toLocaleString() : "—",
      sub: "Replay Coin",
    },
    {
      href: "/library",
      icon: Flame,
      label: "Streak",
      value: mounted ? `${streak.currentStreak}d` : "—",
      sub: `Best ${streak.longestStreak}d`,
    },
    {
      href: "/wrapped",
      icon: Sparkles,
      label: "Replay Score",
      value: mounted ? String(replayScore) : "—",
      sub: tier,
    },
    {
      href: "/journey",
      icon: Sparkles,
      label: "Mission",
      value: missionDone ? "Done" : `${missionPct}%`,
      sub: missionDone ? "Daily complete" : `${mission.completed.length}/${mission.missionIds.length}`,
    },
    {
      href: "/library",
      icon: Trophy,
      label: "Collection",
      value: String(collectionCount),
      sub: "Completed",
    },
  ];

  return (
    <section className="border-y border-white/5 bg-gradient-to-r from-primary/5 via-card/30 to-primary/5 py-4">
      <Container>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="group flex flex-col rounded-2xl border border-white/10 bg-card/60 p-3 backdrop-blur transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
            >
              <s.icon className="size-4 text-primary opacity-80" />
              <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="text-lg font-bold tabular-nums">{s.value}</p>
              <p className="truncate text-[10px] text-muted-foreground">{s.sub}</p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
