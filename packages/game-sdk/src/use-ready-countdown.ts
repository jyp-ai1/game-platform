"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";

import { subscribePlatformAnalyticsEvents } from "./platform-analytics";
import { useGameSlug } from "./game-slug-context";
import { startTrackedSession } from "./session-tracker";
import { playStartSound } from "./sound";
import type { ResumePhase } from "./use-resumable-game";

export interface UseReadyCountdownResult {
  /** True when resume dialog is done and countdown finished */
  canPlay: boolean;
  /** Mirrors canPlay for effect loops with stable deps */
  canPlayRef: MutableRefObject<boolean>;
  showCountdown: boolean;
  completeCountdown: () => void;
}

/**
 * Gates gameplay behind a 3-2-1-GO countdown after the resume phase is "ready".
 * Resets when returning to resume-prompt (new save detected).
 * Retry skips countdown for instant restart (Sprint 13.5).
 */
export function useReadyCountdown(phase: ResumePhase, gameSlug?: string): UseReadyCountdownResult {
  const contextSlug = useGameSlug();
  const slug = gameSlug ?? contextSlug ?? undefined;
  const [countdownDone, setCountdownDone] = useState(false);
  const sessionStarted = useRef(false);

  useEffect(() => {
    if (phase === "ready") {
      setCountdownDone(false);
      sessionStarted.current = false;
    }
  }, [phase]);

  useEffect(() => {
    return subscribePlatformAnalyticsEvents((event) => {
      if (event.type !== "game-retry") return;
      if (gameSlug && event.gameSlug !== gameSlug) return;
      setCountdownDone(true);
    });
  }, [gameSlug]);

  const canPlay = phase === "ready" && countdownDone;
  const canPlayRef = useRef(canPlay);
  canPlayRef.current = canPlay;

  return {
    canPlay,
    canPlayRef,
    showCountdown: phase === "ready" && !countdownDone,
    completeCountdown: () => {
      setCountdownDone(true);
      if (slug && !sessionStarted.current) {
        sessionStarted.current = true;
        startTrackedSession(slug);
        playStartSound();
      }
    },
  };
}
