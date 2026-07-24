import { cache } from "react";

import type { PlatformFlags } from "@game-platform/game-sdk";

import { supabase } from "@/lib/supabase/client";

export type FeatureFlagKey =
  | "weekly_mission"
  | "ranking"
  | "save"
  | "cms"
  | "beta_games";

const DEFAULT_FLAGS: Record<FeatureFlagKey, boolean> = {
  weekly_mission: true,
  ranking: true,
  save: true,
  cms: true,
  beta_games: false,
};

export const getPublicFeatureFlags = cache(async (): Promise<Record<string, boolean>> => {
  const { data, error } = await supabase.rpc("get_public_feature_flags");
  if (error || !data) {
    return DEFAULT_FLAGS;
  }
  return { ...DEFAULT_FLAGS, ...(data as Record<string, boolean>) };
});

export async function getPlatformFlagsFromDb(): Promise<PlatformFlags> {
  const flags = await getPublicFeatureFlags();

  return {
    save: flags.save ?? true,
    ranking: flags.ranking ?? true,
    weeklyMission: flags.weekly_mission ?? true,
  };
}

export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const flags = await getPublicFeatureFlags();
  return flags[key] ?? DEFAULT_FLAGS[key];
}
