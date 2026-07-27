import { appendLifecycle } from "./entry-status-store";

export type GamePhase =
  | "INIT"
  | "LOADING"
  | "READY"
  | "COUNTDOWN"
  | "PLAYING"
  | "DEAD"
  | "RESULT";

let currentPhase: GamePhase = "INIT";

export function getGamePhase(): GamePhase {
  return currentPhase;
}

export function resetGamePhase(): void {
  currentPhase = "INIT";
}

/** Log state machine transitions to lifecycle panel + console. */
export function transitionGamePhase(next: GamePhase, detail?: string): void {
  if (currentPhase === next && !detail) return;
  currentPhase = next;
  const line = detail ? `STATE ${next} (${detail})` : `STATE ${next}`;
  appendLifecycle(line);
  if (typeof console !== "undefined") console.info(`[STATE] ${line}`);
}
