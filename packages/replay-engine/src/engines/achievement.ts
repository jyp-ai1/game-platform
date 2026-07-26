import { Replay } from "@game-platform/replay-sdk";
import { unlockAchievement, getAchievements } from "@game-platform/replay-sdk";

export const Achievement = {
  unlock: unlockAchievement,
  list: getAchievements,
  logic: Replay.logic.achievement,
};
