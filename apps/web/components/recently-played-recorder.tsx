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
import { trackAnalyticsEvent } from "@/lib/supabase/analytics";
import { incrementPlayCount } from "@/lib/supabase/plays";

export function RecentlyPlayedRecorder({
  slug,
  categorySlug,
}: {
  slug: string;
  categorySlug: string | null;
}) {
  useEffect(() => {
    recordPlayed(slug);
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
  }, [slug, categorySlug]);

  return null;
}
