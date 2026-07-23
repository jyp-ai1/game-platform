import { supabase } from "./client";

export type AnalyticsEventType =
  | "session_start"
  | "game_over"
  | "score_submit"
  | "save_created"
  | "resume"
  | "error"
  | "share";

// Best-effort — analytics must never break gameplay.
export async function trackAnalyticsEvent(
  eventType: AnalyticsEventType,
  options: {
    gameSlug?: string;
    deviceId?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const { error } = await supabase.rpc("track_analytics_event", {
    p_event_type: eventType,
    p_game_slug: options.gameSlug ?? null,
    p_device_id: options.deviceId ?? null,
    p_metadata: options.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to track ${eventType}: ${error.message}`);
  }
}
