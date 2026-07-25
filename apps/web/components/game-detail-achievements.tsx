"use client";

import {
  ACHIEVEMENTS,
  getAchievements,
  getServerAchievementsSnapshot,
  isAchievementUnlocked,
  subscribeEngagement,
  type AchievementId,
} from "@game-platform/game-sdk";
import { useSyncExternalStore } from "react";

export function GameDetailAchievements() {
  useSyncExternalStore(subscribeEngagement, getAchievements, getServerAchievementsSnapshot);
  const unlocked = (Object.keys(ACHIEVEMENTS) as AchievementId[]).filter((id) =>
    isAchievementUnlocked(id)
  );

  if (unlocked.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-card/50 p-4 backdrop-blur">
      <h3 className="font-semibold">Achievements</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {unlocked.slice(0, 6).map((id) => (
          <li
            key={id}
            className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium"
          >
            {ACHIEVEMENTS[id].nameKo}
          </li>
        ))}
      </ul>
    </div>
  );
}
