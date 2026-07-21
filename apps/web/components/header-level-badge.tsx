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

export function HeaderLevelBadge() {
  const levelProgress = useSyncExternalStore(
    subscribeEngagement,
    getLevelProgress,
    getServerLevelProgressSnapshot
  );
  const animatedXp = useCountUp(levelProgress.xpIntoLevel);

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
