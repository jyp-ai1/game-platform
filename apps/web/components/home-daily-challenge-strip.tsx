"use client";

import {
  getDailyMission,
  getMissionDefinition,
  getServerDailyMissionSnapshot,
  isDailyChallengeComplete,
  subscribeMissions,
} from "@game-platform/game-sdk";
import { Container } from "@game-platform/ui";
import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { useMounted } from "@/lib/use-mounted";

/** Compact daily challenge row for Home — light, not Journey-depth. */
export function HomeDailyChallengeStrip() {
  const mounted = useMounted();
  const mission = useSyncExternalStore(
    subscribeMissions,
    getDailyMission,
    getServerDailyMissionSnapshot
  );

  if (!mounted || !mission.date) {
    return null;
  }

  const complete = isDailyChallengeComplete(mission);
  const dailyXp = mission.missionIds.reduce(
    (sum, id) => sum + (getMissionDefinition(id)?.xp ?? 0),
    0
  );

  return (
    <section className="border-b py-3 sm:py-4">
      <Container>
        <Link
          href="/journey"
          className="flex items-center justify-between rounded-xl border bg-card/60 px-4 py-3 transition-colors hover:border-primary/40"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Daily Challenge</p>
              <p className="text-xs text-muted-foreground">
                {complete
                  ? "오늘 미션 완료!"
                  : `미션 ${mission.completed.length}/${mission.missionIds.length}`}
                {dailyXp > 0 ? ` · +${dailyXp} XP` : ""}
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </Container>
    </section>
  );
}
