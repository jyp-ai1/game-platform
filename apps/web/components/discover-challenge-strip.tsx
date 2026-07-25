"use client";

import {
  getDailyMission,
  getMissionDefinition,
  getServerDailyMissionSnapshot,
  isDailyChallengeComplete,
  subscribeMissions,
} from "@game-platform/game-sdk";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { useMounted } from "@/lib/use-mounted";

/** Compact Daily Challenge CTA for Discover browse. */
export function DiscoverChallengeStrip() {
  const mounted = useMounted();
  const mission = useSyncExternalStore(
    subscribeMissions,
    getDailyMission,
    getServerDailyMissionSnapshot
  );

  if (!mounted || !mission.date) return null;

  const complete = isDailyChallengeComplete(mission);
  const dailyXp = mission.missionIds.reduce(
    (sum, id) => sum + (getMissionDefinition(id)?.xp ?? 0),
    0
  );

  return (
    <Link
      href="/missions"
      className="flex items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/15 to-card/60 p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
          <Sparkles className="size-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold">Daily Challenge</p>
          <p className="text-xs text-muted-foreground">
            {complete
              ? "Complete — claim rewards"
              : `${mission.completed.length}/${mission.missionIds.length} tasks`}
            {dailyXp > 0 ? ` · +${dailyXp} XP` : ""}
          </p>
        </div>
      </div>
      <span className="text-sm font-medium text-primary">{complete ? "Done ✓" : "Play →"}</span>
    </Link>
  );
}
