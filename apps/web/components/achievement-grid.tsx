"use client";

import {
  ACHIEVEMENTS,
  getAchievements,
  getServerAchievementsSnapshot,
  isAchievementUnlocked,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import { cn } from "@game-platform/ui";
import { useSyncExternalStore } from "react";

export function AchievementGrid() {
  // Subscribed purely to trigger a re-render when unlocks change — each
  // card below re-checks isAchievementUnlocked itself against the same
  // (now-current) cache.
  useSyncExternalStore(
    subscribeEngagement,
    getAchievements,
    getServerAchievementsSnapshot
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Object.values(ACHIEVEMENTS).map((achievement) => {
        const unlocked = isAchievementUnlocked(achievement.id);
        return (
          <div
            key={achievement.id}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border p-4 text-center",
              unlocked ? "bg-card" : "bg-muted/40 grayscale"
            )}
          >
            <span className="text-2xl">{unlocked ? "🏆" : "🔒"}</span>
            <p className="text-sm font-medium">{achievement.nameKo}</p>
            <p className="text-xs text-muted-foreground">
              {achievement.descriptionKo}
            </p>
          </div>
        );
      })}
    </div>
  );
}
