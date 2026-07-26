/**
 * Replay SDK — unified platform API for all games.
 * Games import ONLY this package to get full platform integration.
 */
import {
  recordScoreReport,
  recordNewBest,
  recordSessionStart,
  isAchievementUnlocked,
  getAchievements,
  saveGame,
  loadGame,
  emitPlatformAnalyticsEvent,
  getDailyMission,
  recordMissionScoreReport,
} from "@game-platform/game-sdk";
import {
  createRoom,
  joinRoom,
  send,
  sync,
  start,
  finish,
  spectator,
} from "@game-platform/multiplayer-sdk";

/** Submit score — triggers ranking, XP, missions, rewards. */
export function submitScore(slug: string, score: number): void {
  recordScoreReport(slug, score);
  recordMissionScoreReport(slug, score);
}

/** Unlock / check achievement. */
export function unlockAchievement(id: string): boolean {
  return isAchievementUnlocked(id as Parameters<typeof isAchievementUnlocked>[0]);
}

export { getAchievements as getAchievements };

/** Save / load game stage progress. */
export function saveStage(slug: string, state: unknown): void {
  saveGame(slug, state);
}

export function loadStage(slug: string): unknown {
  return loadGame(slug);
}

/** Collection progress (via save envelope metadata). */
export function saveCollection(slug: string, collection: Record<string, boolean>): void {
  saveGame(slug, { collection });
}

/** Multiplayer room API. */
export const multiplayer = {
  createRoom,
  joinRoom,
  send,
  sync,
  start,
  finish,
  spectator,
};

/** Reward hooks — score report triggers coin/XP via platform. */
export const reward = {
  coin: (slug: string, score: number) => recordScoreReport(slug, score),
  newBest: (slug: string, score: number) => recordNewBest(slug, score),
};

/** Mission completion check. */
export const mission = {
  complete: (slug: string, score: number) => recordMissionScoreReport(slug, score),
  getDaily: getDailyMission,
};

/** Analytics event tracking. */
export const analytics = {
  track: (event: "game-end" | "game-retry" | "save-created" | "save-resumed", slug: string, score?: number) => {
    if (event === "game-end" && score != null) {
      emitPlatformAnalyticsEvent({ type: "game-end", gameSlug: slug, score });
    } else if (event !== "game-end") {
      emitPlatformAnalyticsEvent({ type: event, gameSlug: slug });
    }
  },
  sessionStart: (slug: string, categorySlug: string | null = null) => recordSessionStart(slug, categorySlug),
};

// Re-export core providers for games
export { GameSDKProvider, useGameSDK } from "@game-platform/game-sdk";
export { MultiplayerProvider, useRoom } from "@game-platform/multiplayer-sdk";
