"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";

import { subscribePlatformAnalyticsEvents } from "./platform-analytics";
import { useInstantPlay } from "./instant-play-context";
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
  const instantPlay = useInstantPlay();
  const [countdownDone, setCountdownDone] = useState(instantPlay);
  const sessionStarted = useRef(false);

  useEffect(() => {
    if (phase !== "ready") return;
    setCountdownDone(instantPlay);
    if (instantPlay && slug) {
      if (!sessionStarted.current) {
        sessionStarted.current = true;
        startTrackedSession(slug);
        playStartSound();
      }
      return;
    }
    sessionStarted.current = false;
  }, [phase, instantPlay, slug]);

  useEffect(() => {
    return subscribePlatformAnalyticsEvents((event) => {
      if (event.type !== "game-retry") return;
      if (gameSlug && event.gameSlug !== gameSlug) return;
      setCountdownDone(true);
      if (slug) {
        startTrackedSession(slug);
      }
    });
  }, [gameSlug, slug]);

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
