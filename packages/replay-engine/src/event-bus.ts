/** Replay OS Event Bus — cross-engine communication. */

export type ReplayEventType =
  | "game:start" | "game:end" | "game:score"
  | "player:level-up" | "player:achievement"
  | "creator:publish" | "creator:qa-pass"
  | "multiplayer:room-created" | "multiplayer:match-finish"
  | "growth:mission-complete" | "growth:streak"
  | "ai:qa-result" | "ai:fix-pr"
  | "revenue:earn";

export interface ReplayEvent<T = unknown> {
  type: ReplayEventType;
  payload: T;
  ts: number;
  source?: string;
}

type Listener = (event: ReplayEvent) => void;

const listeners = new Map<ReplayEventType | "*", Set<Listener>>();

export function emit(event: ReplayEvent): void {
  listeners.get(event.type)?.forEach((fn) => fn(event));
  listeners.get("*")?.forEach((fn) => fn(event));
}

export function on(type: ReplayEventType | "*", listener: Listener): () => void {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(listener);
  return () => listeners.get(type)?.delete(listener);
}

export function emitSimple(type: ReplayEventType, payload: unknown = {}, source?: string): void {
  emit({ type, payload, ts: Date.now(), source });
}
