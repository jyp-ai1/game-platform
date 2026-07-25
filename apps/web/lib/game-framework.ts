/**
 * Universal Game Framework — single API for Runtime, Stage, Mission, Reward.
 * Project Phoenix Epic1.
 */
import { getDailyMission } from "@game-platform/game-sdk";

import { getRuntimeConfig, type RuntimeGameConfig } from "@/lib/game-runtime-config";
import { getStagesForGame, getCurrentStage, getNextStage, getStageProgress, type GameStage } from "@/lib/game-stages";
import { applyUniversalRewards, type UniversalRewardBundle } from "@/lib/reward-engine";
import { emitLiveScoreUpdate, emitLiveProfileUpdate } from "@/lib/live-data-bus";
import type { Game } from "@game-platform/shared";

export type { RuntimeGameConfig, GameStage, UniversalRewardBundle as GameEndRewards };

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
    onGameEnd: (score: number, games: Game[] = []) => {
      emitLiveScoreUpdate(slug, score);
      const rewards = applyUniversalRewards(slug, score, games);
      emitLiveProfileUpdate({ gameSlug: slug, score, isNewBest: rewards.isNewBest });
      return rewards;
    },
  };
}
