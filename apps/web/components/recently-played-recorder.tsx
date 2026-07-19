"use client";

import { useEffect } from "react";

import { recordPlayed } from "@/lib/local-storage";
import { incrementPlayCount } from "@/lib/supabase/plays";

export function RecentlyPlayedRecorder({ slug }: { slug: string }) {
  useEffect(() => {
    recordPlayed(slug);
    // Best-effort — a failed play-count increment should never break the page.
    incrementPlayCount(slug).catch(() => {});
  }, [slug]);

  return null;
}
