/**
 * Sprint 13.6 — Game Session API.
 *
 * Games call only these three during play (+ implicit start):
 *
 *   recordStageClear(stageIndex, score)
 *   recordGameRetry()
 *   recordGameEnd({ score, outcome, stageReached, elapsedMs })
 */
import { emitGameRetry } from "./game-retry";
import {
  loadGameProgress,
  recordGameRetry as persistRetry,
  recordStageClear as persistStageClear,
  type GameProgressStats,
} from "./game-progress";
import {
  endTrackedSession,
  resetTrackedSession,
  startTrackedSession,
  updateTrackedScore,
} from "./session-tracker";
import type { GameOutcome } from "./game-standard";

export interface GameEndPayload {
  score: number;
  outcome?: GameOutcome;
  stageReached?: number;
  elapsedMs?: number;
  bestTile?: number;
}

export interface GameSession {
  slug: string;
  /** Elapsed ms since session start. */
  elapsedMs: () => number;
  recordStageClear: (stageIndex: number, score: number) => GameProgressStats;
  recordGameRetry: () => GameProgressStats;
  recordGameEnd: (payload: GameEndPayload) => GameProgressStats;
  getProgress: () => GameProgressStats;
}

/** Create a run session — call once when gameplay begins (after countdown). */
export function createGameSession(gameSlug: string): GameSession {
  const startedAt = Date.now();
  startTrackedSession(gameSlug);

  return {
    slug: gameSlug,
    elapsedMs: () => Date.now() - startedAt,
    recordStageClear(stageIndex: number, score: number) {
      updateTrackedScore(gameSlug, score, stageIndex + 1);
      return persistStageClear(gameSlug, stageIndex, score);
    },
    recordGameRetry() {
      emitGameRetry(gameSlug);
      resetTrackedSession(gameSlug);
      return persistRetry(gameSlug);
    },
    recordGameEnd(payload: GameEndPayload) {
      updateTrackedScore(gameSlug, payload.score, payload.stageReached);
      endTrackedSession(gameSlug, payload.score, payload.stageReached);
      return loadGameProgress(gameSlug);
    },
    getProgress: () => loadGameProgress(gameSlug),
  };
}
