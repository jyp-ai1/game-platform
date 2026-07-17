"use client";

import { useEffect } from "react";

import { recordPlayed } from "@/lib/local-storage";

export function RecentlyPlayedRecorder({ slug }: { slug: string }) {
  useEffect(() => {
    recordPlayed(slug);
  }, [slug]);

  return null;
}
