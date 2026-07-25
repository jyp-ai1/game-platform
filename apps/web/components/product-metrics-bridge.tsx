"use client";

import { useEffect } from "react";

import {
  getDeviceId,
  subscribeEngagementEvents,
  subscribePlatformAnalyticsEvents,
} from "@game-platform/game-sdk";

import { recordFirstVisit, recordProductMetric } from "@/lib/product-metrics-store";
import { ensureReplayPassport } from "@/lib/passport-store";
import { recordVisit } from "@/lib/growth-engine";

/** Mirrors key events into Product OS local KPI store. */
export function ProductMetricsBridge() {
  useEffect(() => {
    recordFirstVisit();
    recordProductMetric("session_start");
    ensureReplayPassport();
    recordVisit();

    const offEngagement = subscribeEngagementEvents((event) => {
      if (event.type === "new-record") {
        recordProductMetric("ranking_submit", { gameSlug: event.gameSlug });
      }
    });

    const offPlatform = subscribePlatformAnalyticsEvents((event) => {
      if (event.type === "game-end") {
        recordProductMetric("game_end", { gameSlug: event.gameSlug });
      }
    });

    return () => {
      offEngagement();
      offPlatform();
    };
  }, []);

  return null;
}

export function trackShareMetric(): void {
  recordProductMetric("share", { gameSlug: undefined });
}

export function trackInviteMetric(): void {
  recordProductMetric("invite");
}

export function trackChallengeMetric(): void {
  recordProductMetric("challenge");
}

export function trackBugMetric(): void {
  recordProductMetric("bug_report");
}

export function trackErrorMetric(): void {
  recordProductMetric("error");
}

export { getDeviceId };