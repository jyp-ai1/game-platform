// A deliberately ephemeral pub/sub, separate from engagement.ts's persisted
// state — "state changed, re-render" and "show a toast" are different
// concerns. Conflating them would fire a spurious toast every time a
// consumer re-subscribes (e.g. on tab refocus), since that path re-reads
// state but nothing actually just happened.
export type EngagementEvent =
  | { type: "achievement-unlocked"; achievementId: string; nameKo: string }
  | { type: "level-up"; newLevel: number }
  | { type: "new-record"; gameSlug: string; score: number };

type Listener = (event: EngagementEvent) => void;

const listeners = new Set<Listener>();

export function emitEngagementEvent(event: EngagementEvent): void {
  for (const listener of listeners) listener(event);
}

export function subscribeEngagementEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
