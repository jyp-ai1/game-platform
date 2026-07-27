"use client";

import { Coins, Sparkles, Target } from "lucide-react";

import { getPlatformAchievementTitle } from "@/lib/achievement-engine";
import type { UniversalRewardBundle } from "@/lib/reward-engine";
import { getTodayMissionProgress } from "@/lib/universal-mission-engine";

/** Session exit only — score / XP / coin / mission / achievement. No social or loop chrome. */
export function GameResultReplayMoment({
  rewards,
  level,
  levelXpGain,
}: {
  rewards: UniversalRewardBundle;
  level: number;
  levelXpGain: number;
}) {
  const mission = getTodayMissionProgress();

  const rows = [
    {
      icon: Sparkles,
      label: "XP",
      value: `+${rewards.xpDisplay}`,
      sub: `Lv.${level}${levelXpGain > 100 ? " ↑" : ""}`,
    },
    {
      icon: Coins,
      label: "Coin",
      value: `+${rewards.coins}`,
      sub: null,
    },
    mission.total > 0
      ? {
          icon: Target,
          label: "미션 진행",
          value: `${mission.done}/${mission.total}`,
          sub: mission.done >= mission.total ? "완료" : "진행 중",
        }
      : null,
    rewards.newAchievements.length > 0
      ? {
          icon: Sparkles,
          label: "업적 달성",
          value: rewards.newAchievements.map(getPlatformAchievementTitle).join(", "),
          sub: null,
        }
      : null,
  ].filter(Boolean) as Array<{
    icon: typeof Sparkles;
    label: string;
    value: string;
    sub: string | null;
  }>;

  return (
    <ul className="mt-5 space-y-3 border-t border-white/10 pt-4">
      {rows.map((row) => (
        <li key={row.label} className="flex items-start gap-3 text-sm">
          <row.icon className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{row.label}</p>
            <p className="font-semibold tabular-nums">{row.value}</p>
            {row.sub ? <p className="text-xs text-muted-foreground">{row.sub}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
