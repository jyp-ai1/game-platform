/**
 * Universal Game Framework — single API for Runtime, Stage, Mission, Reward.
 * Project Phoenix Epic1.
 */
import { getDailyMission } from "@game-platform/game-sdk";

import { getRuntimeConfig, type RuntimeGameConfig } from "@/lib/game-runtime-config";
import { getStagesForGame, getCurrentStage, getNextStage, getStageProgress, type GameStage } from "@/lib/game-stages";
import { applyGameEndRetention, type GameEndRewards } from "@/lib/retention-engine";
import { emitLiveScoreUpdate, emitLiveProfileUpdate } from "@/lib/live-data-bus";

export type { RuntimeGameConfig, GameStage, GameEndRewards };

export function getGameFramework(slug: string) {
  const runtime = getRuntimeConfig(slug);
  const stages = getStagesForGame(slug);
  const mission = typeof window !== "undefined" ? getDailyMission() : null;

  return {
    runtime,
    stages,
    mission,
    getCurrentStage: (score: number) => getCurrentStage(slug, score),
    getNextStage: (score: number) => getNextStage(slug, score),
    getProgress: (score: number) => getStageProgress(slug, score),
    onGameEnd: (score: number) => {
      emitLiveScoreUpdate(slug, score);
      const rewards = applyGameEndRetention(slug, score);
      emitLiveProfileUpdate({ gameSlug: slug, score, isNewBest: rewards.isNewBest });
      return rewards;
    },
  };
}
