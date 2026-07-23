import { cache } from "react";

import { supabase } from "./client";

export type CmsBanner = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  button_text: string | null;
  sort_order: number;
};

export type CmsNotice = {
  id: string;
  notice_type: string;
  title: string;
  body: string;
};

export type CmsFeaturedSlot =
  | "weekly_pick"
  | "editors_pick"
  | "trending"
  | "new_games"
  | "popular";

export type CmsFeatured = {
  slot: CmsFeaturedSlot;
  game_slug: string;
  sort_order: number;
};

export const fetchActiveBanners = cache(async (): Promise<CmsBanner[]> => {
  const { data, error } = await supabase
    .from("cms_banners")
    .select("id, title, image_url, link_url, button_text, sort_order")
    .order("sort_order");
  if (error) return [];
  return data ?? [];
});

export const fetchActiveNotices = cache(async (): Promise<CmsNotice[]> => {
  const { data, error } = await supabase
    .from("cms_notices")
    .select("id, notice_type, title, body")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) return [];
  return data ?? [];
});

export const fetchActiveFeatured = cache(async (): Promise<CmsFeatured[]> => {
  const { data, error } = await supabase
    .from("cms_featured_games")
    .select("slot, game_slug, sort_order")
    .eq("is_active", true)
    .order("slot")
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as CmsFeatured[];
});

export const fetchActiveEvents = cache(async () => {
  const { data, error } = await supabase
    .from("cms_events")
    .select("id, title, description, game_slug, reward_text, starts_at, ends_at")
    .order("starts_at", { ascending: false })
    .limit(3);
  if (error) return [];
  return data ?? [];
});
