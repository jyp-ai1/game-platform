// Ephemeral pub/sub for platform analytics — apps/web subscribes and forwards
// to Supabase analytics_events. Keeps game-sdk free of Supabase dependency.

export type PlatformAnalyticsEvent =
  | { type: "game-end"; gameSlug: string; score: number }
  | { type: "save-created"; gameSlug: string }
  | { type: "save-resumed"; gameSlug: string };

type Listener = (event: PlatformAnalyticsEvent) => void;

const listeners = new Set<Listener>();

export function emitPlatformAnalyticsEvent(event: PlatformAnalyticsEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribePlatformAnalyticsEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
