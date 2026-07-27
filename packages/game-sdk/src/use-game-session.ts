"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  createGameSession,
  type GameEndPayload,
  type GameSession,
} from "./game-session";
import type { GameProgressStats } from "./game-progress";

export interface UseGameSessionResult {
  recordStageClear: (stageIndex: number, score: number) => GameProgressStats | undefined;
  recordGameRetry: () => GameProgressStats | undefined;
  recordGameEnd: (payload: GameEndPayload) => GameProgressStats | undefined;
  resetSession: () => void;
  getProgress: () => GameProgressStats | undefined;
}

/**
 * React hook wrapping `createGameSession`. Starts a session when `active`
 * becomes true (typically after ReadyCountdown completes).
 */
export function useGameSession(gameSlug: string, active: boolean): UseGameSessionResult {
  const sessionRef = useRef<GameSession | null>(null);

  useEffect(() => {
    if (active && !sessionRef.current) {
      sessionRef.current = createGameSession(gameSlug);
    }
  }, [active, gameSlug]);

  const resetSession = useCallback(() => {
    sessionRef.current = createGameSession(gameSlug);
  }, [gameSlug]);

  const recordStageClear = useCallback((stageIndex: number, score: number) => {
    return sessionRef.current?.recordStageClear(stageIndex, score);
  }, []);

  const recordGameRetry = useCallback(() => {
    return sessionRef.current?.recordGameRetry();
  }, []);

  const recordGameEnd = useCallback((payload: GameEndPayload) => {
    return sessionRef.current?.recordGameEnd(payload);
  }, []);

  const getProgress = useCallback(() => {
    return sessionRef.current?.getProgress();
  }, []);

  return { recordStageClear, recordGameRetry, recordGameEnd, resetSession, getProgress };
}
