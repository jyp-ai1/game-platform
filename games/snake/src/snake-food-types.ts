import type { FoodKind } from "@game-platform/shared";

export type FoodTier = "small" | "medium" | "large" | "rare";

export interface FoodTierConfig {
  tier: FoodTier;
  kind: FoodKind;
  score: number;
  /** Growth credits toward next segment (threshold = 2) */
  growthCredits: number;
  sizePx: number;
  color: string;
  glow: string;
  particleCount: number;
  soundHz: number;
}

export const FOOD_TIERS: Record<FoodTier, FoodTierConfig> = {
  small: {
    tier: "small",
    kind: "normal",
    score: 1,
    growthCredits: 1,
    sizePx: 6,
    color: "#fbbf24",
    glow: "0 0 6px #fbbf24",
    particleCount: 8,
    soundHz: 660,
  },
  medium: {
    tier: "medium",
    kind: "meteor",
    score: 3,
    growthCredits: 1,
    sizePx: 10,
    color: "#f97316",
    glow: "0 0 10px #fb923c",
    particleCount: 12,
    soundHz: 740,
  },
  large: {
    tier: "large",
    kind: "meteor",
    score: 7,
    growthCredits: 2,
    sizePx: 14,
    color: "#22d3ee",
    glow: "0 0 14px #22d3ee",
    particleCount: 18,
    soundHz: 820,
  },
  rare: {
    tier: "rare",
    kind: "golden_apple",
    score: 15,
    growthCredits: 4,
    sizePx: 18,
    color: "#a855f7",
    glow: "0 0 18px #c084fc",
    particleCount: 24,
    soundHz: 980,
  },
};

/** Weighted roll — mostly small, rare is special */
export function rollFoodTier(): FoodTier {
  const r = Math.random();
  if (r < 0.58) return "small";
  if (r < 0.84) return "medium";
  if (r < 0.97) return "large";
  return "rare";
}

export function tierFromKind(kind: FoodKind, value: number): FoodTier {
  if (kind === "golden_apple" || value >= 12) return "rare";
  if (kind === "meteor" || value >= 6) return value >= 7 ? "large" : "medium";
  if (value >= 7) return "large";
  if (value >= 3) return "medium";
  return "small";
}

export function getFoodVisual(tier: FoodTier): FoodTierConfig {
  return FOOD_TIERS[tier];
}
