import { supabase } from "./client";

export type AnalyticsEventType =
  | "session_start"
  | "game_start"
  | "game_end"
  | "game_pause"
  | "game_resume"
  | "game_over"
  | "score_submit"
  | "ranking_submit"
  | "achievement_unlock"
  | "mission_complete"
  | "weekly_mission_complete"
  | "daily_reward"
  | "daily_reward_claim"
  | "save_created"
  | "resume"
  | "favorite"
  | "profile_open"
  | "error"
  | "share"
  | "invite"
  | "purchase"
  | "ad_view";

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
