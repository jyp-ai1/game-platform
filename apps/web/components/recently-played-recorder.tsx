"use client";

import {
  recordMissionSessionStart,
  recordSessionStart,
} from "@game-platform/game-sdk";
import { useEffect } from "react";

import { recordPlayed } from "@/lib/local-storage";
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
    recordMissionSessionStart(slug, categorySlug);
    // Best-effort — a failed play-count increment should never break the page.
    incrementPlayCount(slug).catch(() => {});
  }, [slug, categorySlug]);

  return null;
}
