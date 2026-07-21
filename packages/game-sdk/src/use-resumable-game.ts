"use client";

import { useRef, useState, type MutableRefObject } from "react";

import { clearSave, hasSave, loadGame } from "./save";

export type ResumePhase = "resume-prompt" | "ready";

export interface UseResumableGameResult<State> {
  phase: ResumePhase;
  initialState: State;
  /** Mirrors `phase` every render — read this (not `phase`) inside effects
   * with an empty/mount-once deps array (ticking intervals, rAF loops,
   * window listeners) so they can gate dispatches without re-subscribing. */
  phaseRef: MutableRefObject<ResumePhase>;
  onResume: () => void;
  onNewGame: () => void;
}

/**
 * Resolves whether a game should start from a save or fresh, and gates
 * gameplay behind a Resume Dialog when a save exists. `useReducer` can't be
 * "paused" mid-initialization (Rules of Hooks), so the starting state is
 * decided once via useState's lazy initializer *before* the reducer mounts;
 * callers do `useReducer(reducer, initialState)` (no third-arg lazy init).
 */
export function useResumableGame<State>(
  slug: string,
  createInitialState: () => State
): UseResumableGameResult<State> {
  const [savedState] = useState<State | null>(() =>
    hasSave(slug) ? loadGame<State>(slug) : null
  );

  const [phase, setPhase] = useState<ResumePhase>(
    savedState !== null ? "resume-prompt" : "ready"
  );
  const [initialState, setInitialState] = useState<State>(
    () => savedState ?? createInitialState()
  );

  const phaseRef = useRef<ResumePhase>(phase);
  phaseRef.current = phase;

  function onResume(): void {
    setPhase("ready");
  }

  function onNewGame(): void {
    clearSave(slug);
    setInitialState(createInitialState());
    setPhase("ready");
  }

  return { phase, initialState, phaseRef, onResume, onNewGame };
}
