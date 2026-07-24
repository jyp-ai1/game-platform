"use client";

import {
  getLevelProgress,
  getServerLevelProgressSnapshot,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import { Progress } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { useCountUp } from "@/lib/use-count-up";
import { useMounted } from "@/lib/use-mounted";

export function HeaderLevelBadge() {
  const mounted = useMounted();

  const levelProgress = useSyncExternalStore(
    subscribeEngagement,
    getLevelProgress,
    getServerLevelProgressSnapshot
  );
  const animatedXp = useCountUp(levelProgress.xpIntoLevel);

  if (!mounted) {
    return (
      <Link
        href="/profile"
        title="레벨 · XP"
        className="mr-1 hidden w-24 flex-col gap-0.5 text-xs sm:flex"
        aria-hidden
      >
        <span className="font-medium tabular-nums opacity-0">Lv.1 · 0 / 100 XP</span>
        <Progress value={0} label="레벨 진행률" />
      </Link>
    );
  }

  return (
    <Link
      href="/profile"
      title={`레벨 ${levelProgress.level} · ${levelProgress.xpIntoLevel} / ${levelProgress.xpNeededForLevel} XP`}
      className="mr-1 hidden w-24 flex-col gap-0.5 text-xs sm:flex"
    >
      <span className="font-medium tabular-nums">
        Lv.{levelProgress.level} · {animatedXp} / {levelProgress.xpNeededForLevel} XP
      </span>
      <Progress
        value={levelProgress.percent}
        label={`레벨 ${levelProgress.level} 진행률`}
      />
    </Link>
  );
}
