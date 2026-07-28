/**
 * Sprint 14 — in-memory session tracker for platform-wide progress.
 * Bridges games that don't call useGameSession explicitly.
 */
import { recordGameRunEnd, recordGameRunStart } from "./game-progress";

interface TrackedSession {
  startedAt: number;
  lastScore: number;
  stageReached: number;
  ended: boolean;
}

const sessions = new Map<string, TrackedSession>();

export function startTrackedSession(gameSlug: string): void {
  if (sessions.has(gameSlug) && !sessions.get(gameSlug)!.ended) {
    return;
  }
  recordGameRunStart(gameSlug);
  sessions.set(gameSlug, {
    startedAt: Date.now(),
    lastScore: 0,
    stageReached: 1,
    ended: false,
  });
}

export function updateTrackedScore(
  gameSlug: string,
  score: number,
  stageReached?: number
): void {
  if (!sessions.has(gameSlug)) {
    startTrackedSession(gameSlug);
  }
  const current = sessions.get(gameSlug)!;
  current.lastScore = score;
  if (stageReached != null) {
    current.stageReached = stageReached;
  }
}

export function endTrackedSession(
  gameSlug: string,
  score?: number,
  stageReached?: number
): void {
  const session = sessions.get(gameSlug);
  if (!session || session.ended) return;
  session.ended = true;
  recordGameRunEnd(gameSlug, score ?? session.lastScore, {
    elapsedMs: Date.now() - session.startedAt,
    stageReached: stageReached ?? session.stageReached,
  });
  sessions.delete(gameSlug);
}

export function resetTrackedSession(gameSlug: string): void {
  sessions.delete(gameSlug);
}

export function getTrackedSession(gameSlug: string): TrackedSession | undefined {
  return sessions.get(gameSlug);
}
