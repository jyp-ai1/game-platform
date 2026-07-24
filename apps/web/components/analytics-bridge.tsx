"use client";

import {
  getDeviceId,
  isSaveEnabled,
  isWeeklyMissionEnabled,
  subscribeEngagementEvents,
  subscribePlatformAnalyticsEvents,
  type EngagementEvent,
  type PlatformAnalyticsEvent,
} from "@game-platform/game-sdk";
import { useEffect } from "react";

import { trackAnalyticsEvent } from "@/lib/supabase/analytics";

function track(event: Parameters<typeof trackAnalyticsEvent>[0], meta: Record<string, unknown> = {}, gameSlug?: string) {
  trackAnalyticsEvent(event, {
    gameSlug,
    deviceId: getDeviceId(),
    metadata: meta,
  }).catch(() => {});
}

function onEngagement(event: EngagementEvent) {
  switch (event.type) {
    case "achievement-unlocked":
      track("achievement_unlock", {
        achievement_id: event.achievementId,
        name_ko: event.nameKo,
      });
      break;
    case "mission-completed":
      track("mission_complete", {
        mission_id: event.missionId,
        title: event.title,
        xp: event.xp,
      });
      break;
    case "weekly-mission-completed":
      if (!isWeeklyMissionEnabled()) break;
      track("weekly_mission_complete", {
        mission_id: event.missionId,
        title: event.title,
        xp: event.xp,
      });
      break;
    case "daily-reward-claimed":
      track("daily_reward", { xp: event.xp, streak_day: event.streakDay });
      break;
    case "new-record":
      track("score_submit", { score: event.score }, event.gameSlug);
      break;
    default:
      break;
  }
}

function onPlatform(event: PlatformAnalyticsEvent) {
  switch (event.type) {
    case "game-end":
      track("game_end", { score: event.score }, event.gameSlug);
      break;
    case "game-retry":
      track("game_start", { retry: true }, event.gameSlug);
      break;
    case "save-created":
      if (!isSaveEnabled()) break;
      track("save_created", {}, event.gameSlug);
      break;
    case "save-resumed":
      if (!isSaveEnabled()) break;
      track("resume", {}, event.gameSlug);
      break;
  }
}

/** Forwards game-sdk engagement/platform events to Supabase analytics_events. */
export function AnalyticsBridge() {
  useEffect(() => {
    const offEngagement = subscribeEngagementEvents(onEngagement);
    const offPlatform = subscribePlatformAnalyticsEvents(onPlatform);
    return () => {
      offEngagement();
      offPlatform();
    };
  }, []);

  return null;
}
