"use client";

import { useEffect, useRef, useState } from "react";

import { saveGame } from "./save";

export type SaveIndicatorStatus = "idle" | "saving" | "saved";

// "5초 또는 state 변경 둘 중 먼저" — read literally as two triggers: a 300ms
// debounce on state change (coalesces bursts like Breakout's ~60/sec reducer
// updates into one write once the state stream is quiet) plus a 5s interval
// as a hard fallback that fires even when nothing discrete changes for a
// while (e.g. Minesweeper thinking-time). The interval is the literal 5s
// deadline; the debounce is flood control around bursts — saving on every
// single Breakout frame would mean up to 60 localStorage writes/sec.
const STATE_CHANGE_DEBOUNCE_MS = 300;
const HARD_SAVE_INTERVAL_MS = 5000;
const SAVED_BADGE_MS = 800;

/**
 * Auto-saves `serialize()`'s return value under `slug` whenever any value in
 * `deps` changes (debounced) or every 5s as a fallback. `serialize` returning
 * `null` skips that cycle (used for terminal-status / "nothing worth saving
 * yet" cases). Returns the current save-indicator status for `<SaveIndicator>`.
 */
export function useAutoSave<T>(
  slug: string,
  serialize: () => T | null,
  deps: readonly unknown[]
): SaveIndicatorStatus {
  const [status, setStatus] = useState<SaveIndicatorStatus>("idle");
  const serializeRef = useRef(serialize);
  serializeRef.current = serialize;
  const lastSavedAtRef = useRef(0);
  const savedBadgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function performSave(): void {
    const state = serializeRef.current();
    if (state === null) {
      return;
    }
    saveGame(slug, state);
    lastSavedAtRef.current = Date.now();
    if (savedBadgeTimeoutRef.current) {
      clearTimeout(savedBadgeTimeoutRef.current);
    }
    setStatus("saving");
    setStatus("saved");
    savedBadgeTimeoutRef.current = setTimeout(
      () => setStatus("idle"),
      SAVED_BADGE_MS
    );
  }

  useEffect(() => {
    const timeout = setTimeout(performSave, STATE_CHANGE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // deps is caller-provided (deliberately spread) — this hook's contract is
    // "re-run whenever any value in deps changes," mirroring useEffect itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastSavedAtRef.current >= HARD_SAVE_INTERVAL_MS) {
        performSave();
      }
    }, HARD_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    return () => {
      if (savedBadgeTimeoutRef.current) {
        clearTimeout(savedBadgeTimeoutRef.current);
      }
    };
  }, []);

  return status;
}
