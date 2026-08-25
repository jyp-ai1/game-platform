/**
 * Sprint17 STEP5 — minimal analytics envelope.
 * Reuses trackAnalyticsEvent; always attaches user_id, game_id, session_id, room_id, timestamp.
 */
import { trackAnalyticsEvent, type AnalyticsEventType } from "@/lib/supabase/analytics";
import { getPlayerId } from "@/lib/auth/player-id";

const SESSION_KEY = "play29:analytics-session-id";

export function getOrCreateAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `s_${Date.now().toString(36)}`;
  }
}

export function trackGame29Min(
  eventType: AnalyticsEventType,
  opts: {
    gameId: string;
    roomId?: string | null;
    deviceId?: string;
    extra?: Record<string, unknown>;
  }
): void {
  const timestamp = new Date().toISOString();
  trackAnalyticsEvent(eventType, {
    gameSlug: opts.gameId,
    deviceId: opts.deviceId,
    metadata: {
      user_id: getPlayerId(),
      game_id: opts.gameId,
      session_id: getOrCreateAnalyticsSessionId(),
      room_id: opts.roomId ?? null,
      timestamp,
      ...(opts.extra ?? {}),
    },
  }).catch(() => {});
}
