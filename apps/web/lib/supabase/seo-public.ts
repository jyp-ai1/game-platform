import { cache } from "react";

import { supabase } from "./client";

export type SeoVerification = {
  google: string | null;
  bing: string | null;
  naver: string | null;
};

export const fetchSeoVerification = cache(async (): Promise<SeoVerification> => {
  const { data, error } = await supabase
    .from("seo_settings")
    .select("key, value")
    .in("key", ["google_verification", "bing_verification", "naver_verification"]);

  if (error) {
    return { google: null, bing: null, naver: null };
  }

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  const pick = (key: string) => {
    const v = map.get(key);
    return v && v.trim() ? v.trim() : null;
  };

  return {
    google: pick("google_verification"),
    bing: pick("bing_verification"),
    naver: pick("naver_verification"),
  };
});
