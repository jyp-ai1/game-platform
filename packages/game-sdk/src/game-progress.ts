/**
 * Sprint 13.6 — unified per-game progress (Stage, Best, Stats).
 * All single-player games read/write through this module.
 */
import { getBestScore, setBestScore } from "./local-storage";
import { clearSave, loadGame, saveGame } from "./save";

export const PROGRESS_SAVE_VERSION = 1;

export interface GameProgressStats {
  currentStage: number;
  bestStage: number;
  bestScore: number;
  bestTile: number;
  playCount: number;
  bestTimeMs: number | null;
  retryCount: number;
  totalPlayTimeMs: number;
  totalScoreSum: number;
  sessionCount: number;
  lastPlayedAt: string | null;
  lastCrashAt: string | null;
}

export interface OperationalMetrics {
  avgPlayTimeMs: number | null;
  avgScore: number | null;
  retryRate: number | null;
}

const DEFAULT_STATS: GameProgressStats = {
  currentStage: 1,
  bestStage: 1,
  bestScore: 0,
  bestTile: 0,
  playCount: 0,
  bestTimeMs: null,
  retryCount: 0,
  totalPlayTimeMs: 0,
  totalScoreSum: 0,
  sessionCount: 0,
  lastPlayedAt: null,
  lastCrashAt: null,
};

export function getOperationalMetrics(stats: GameProgressStats): OperationalMetrics {
  return {
    avgPlayTimeMs:
      stats.sessionCount > 0 ? Math.round(stats.totalPlayTimeMs / stats.sessionCount) : null,
    avgScore: stats.sessionCount > 0 ? Math.round(stats.totalScoreSum / stats.sessionCount) : null,
    retryRate: stats.playCount > 0 ? stats.retryCount / stats.playCount : null,
  };
}

function progressSlug(gameSlug: string): string {
  return `${gameSlug}-progress`;
}

export function loadGameProgress(gameSlug: string): GameProgressStats {
  const saved = loadGame<GameProgressStats>(progressSlug(gameSlug));
  if (!saved) {
    return {
      ...DEFAULT_STATS,
      bestScore: getBestScore(gameSlug),
    };
  }
  return {
    ...DEFAULT_STATS,
    ...saved,
    bestScore: Math.max(saved.bestScore ?? 0, getBestScore(gameSlug)),
  };
}

export function saveGameProgress(gameSlug: string, patch: Partial<GameProgressStats>): GameProgressStats {
  const prev = loadGameProgress(gameSlug);
  const next: GameProgressStats = {
    ...prev,
    ...patch,
    bestStage: Math.max(prev.bestStage, patch.bestStage ?? prev.bestStage, patch.currentStage ?? prev.currentStage),
    bestScore: Math.max(prev.bestScore, patch.bestScore ?? prev.bestScore),
    bestTile: Math.max(prev.bestTile, patch.bestTile ?? prev.bestTile),
    lastPlayedAt: patch.lastPlayedAt ?? new Date().toISOString(),
  };
  saveGame(progressSlug(gameSlug), next);
  if (next.bestScore > getBestScore(gameSlug)) {
    setBestScore(gameSlug, next.bestScore);
  }
  return next;
}

/** Call once when a run starts. */
export function recordGameRunStart(gameSlug: string): GameProgressStats {
  const prev = loadGameProgress(gameSlug);
  return saveGameProgress(gameSlug, { playCount: prev.playCount + 1 });
}

/** Call on Retry. */
export function recordGameRetry(gameSlug: string): GameProgressStats {
  const prev = loadGameProgress(gameSlug);
  return saveGameProgress(gameSlug, { retryCount: prev.retryCount + 1 });
}

/** Call on stage clear — advances current stage. */
export function recordStageClear(gameSlug: string, stageIndex: number, score: number): GameProgressStats {
  const nextStage = stageIndex + 1;
  return saveGameProgress(gameSlug, {
    currentStage: nextStage,
    bestStage: nextStage,
    bestScore: score,
  });
}

/** Call on game over / exit with final score and optional elapsed ms. */
export function recordGameRunEnd(
  gameSlug: string,
  score: number,
  options?: { elapsedMs?: number; stageReached?: number; bestTile?: number }
): GameProgressStats {
  const prev = loadGameProgress(gameSlug);
  const elapsedMs = options?.elapsedMs ?? 0;
  const bestTimeMs =
    options?.elapsedMs != null
      ? prev.bestTimeMs == null
        ? options.elapsedMs
        : Math.min(prev.bestTimeMs, options.elapsedMs)
      : prev.bestTimeMs;
  return saveGameProgress(gameSlug, {
    bestScore: score,
    bestTile: Math.max(prev.bestTile, options?.bestTile ?? 0),
    bestStage: Math.max(prev.bestStage, options?.stageReached ?? prev.currentStage),
    bestTimeMs,
    totalPlayTimeMs: prev.totalPlayTimeMs + elapsedMs,
    totalScoreSum: prev.totalScoreSum + score,
    sessionCount: prev.sessionCount + 1,
  });
}

/** Record a crash for operator visibility. */
export function recordGameCrash(gameSlug: string): GameProgressStats {
  return saveGameProgress(gameSlug, { lastCrashAt: new Date().toISOString() });
}

/** Alias — preferred name in Game Session API. */
export const recordGameEnd = recordGameRunEnd;

export function clearGameProgress(gameSlug: string): void {
  clearSave(progressSlug(gameSlug));
}
