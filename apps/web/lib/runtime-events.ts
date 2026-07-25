/**
 * Universal Runtime event bus — Track 1.
 * Phases: loading → ready → countdown → playing → pause → gameover → reward → continue
 */
export type RuntimePhase =
  | "loading"
  | "tutorial"
  | "ready"
  | "countdown"
  | "playing"
  | "paused"
  | "gameover"
  | "reward"
  | "continue";

export type RuntimeEvent =
  | { type: "phase"; phase: RuntimePhase }
  | { type: "game-end"; gameSlug: string; score: number }
  | { type: "reward-shown"; xp: number; coins: number }
  | { type: "mission-trigger" }
  | { type: "collection-trigger"; gameSlug: string }
  | { type: "analytics"; name: string; payload?: Record<string, unknown> };

type RuntimeListener = (event: RuntimeEvent) => void;

const listeners = new Set<RuntimeListener>();
let currentPhase: RuntimePhase = "loading";

export function getRuntimePhase(): RuntimePhase {
  return currentPhase;
}

export function setRuntimePhase(phase: RuntimePhase): void {
  currentPhase = phase;
  emitRuntimeEvent({ type: "phase", phase });
}

export function emitRuntimeEvent(event: RuntimeEvent): void {
  if (event.type === "phase") currentPhase = event.phase;
  for (const l of listeners) l(event);
}

export function subscribeRuntimeEvents(listener: RuntimeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
