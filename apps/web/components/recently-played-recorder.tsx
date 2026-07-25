"use client";

import {
  claimDailyReward,
  getDeviceId,
  recordMissionSessionStart,
  recordSeasonSessionStart,
  recordSessionStart,
  recordWeeklyMissionSessionStart,
} from "@game-platform/game-sdk";
import { useEffect } from "react";

import { recordPlayed } from "@/lib/local-storage";
import { recordPlayHistorySession } from "@/lib/play-history";
import { trackAnalyticsEvent } from "@/lib/supabase/analytics";
import { incrementPlayCount } from "@/lib/supabase/plays";

export function RecentlyPlayedRecorder({
  slug,
  categorySlug,
  difficulty = "MEDIUM",
}: {
  slug: string;
  categorySlug: string | null;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}) {
  useEffect(() => {
    recordPlayed(slug);
    recordPlayHistorySession(slug, categorySlug, difficulty);
    recordSessionStart(slug, categorySlug);
    claimDailyReward();
    recordMissionSessionStart(slug, categorySlug);
    recordWeeklyMissionSessionStart(slug, categorySlug);
    recordSeasonSessionStart();
    // Best-effort — a failed play-count increment should never break the page.
    incrementPlayCount(slug).catch(() => {});
    trackAnalyticsEvent("session_start", {
      gameSlug: slug,
      deviceId: getDeviceId(),
    }).catch(() => {});
    trackAnalyticsEvent("game_start", {
      gameSlug: slug,
      deviceId: getDeviceId(),
    }).catch(() => {});
  }, [slug, categorySlug, difficulty]);

  return null;
}
