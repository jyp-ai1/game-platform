"use client";

import {
  getDailyMission,
  getMissionDefinition,
  getServerDailyMissionSnapshot,
  isDailyChallengeComplete,
  subscribeMissions,
} from "@game-platform/game-sdk";
import { Badge } from "@game-platform/ui";
import { Target } from "lucide-react";
import { useSyncExternalStore } from "react";

import { replayCard } from "@/lib/replay-os";

export function GameDetailMissionPanel({ gameSlug }: { gameSlug: string }) {
  const mission = useSyncExternalStore(
    subscribeMissions,
    getDailyMission,
    getServerDailyMissionSnapshot
  );

  const complete = mission ? isDailyChallengeComplete(mission) : false;
  const done = mission?.completed.length ?? 0;
  const total = mission?.missionIds.length ?? 3;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const firstMission = mission?.missionIds[0]
    ? getMissionDefinition(mission.missionIds[0])
    : null;

  return (
    <section className={replayCard("p-5")}>
      <div className="flex items-center gap-2">
        <Target className="size-4 text-primary" />
        <h3 className="font-semibold">Daily Mission</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {gameSlug}
        </Badge>
      </div>
      {firstMission ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{firstMission.title}</p>
          <div className="mt-3 flex justify-between text-xs">
            <span>
              {done}/{total} {complete ? "Complete!" : ""}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Play to start today&apos;s mission.</p>
      )}
    </section>
  );
}
