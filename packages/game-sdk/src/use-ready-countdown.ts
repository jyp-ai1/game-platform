"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";

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
 */
export function useReadyCountdown(phase: ResumePhase): UseReadyCountdownResult {
  const [countdownDone, setCountdownDone] = useState(false);

  useEffect(() => {
    if (phase === "ready") {
      setCountdownDone(false);
    }
  }, [phase]);

  const canPlay = phase === "ready" && countdownDone;
  const canPlayRef = useRef(canPlay);
  canPlayRef.current = canPlay;

  return {
    canPlay,
    canPlayRef,
    showCountdown: phase === "ready" && !countdownDone,
    completeCountdown: () => setCountdownDone(true),
  };
}
