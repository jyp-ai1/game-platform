import type { FoodKind } from "@game-platform/shared";

export type FoodTier = "small" | "medium" | "large" | "epic" | "death";

export interface FoodTierConfig {
  tier: FoodTier;
  kind: FoodKind;
  score: number;
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
    sizePx: 6,
    color: "#fbbf24",
    glow: "0 0 6px #fbbf24",
    particleCount: 8,
    soundHz: 660,
  },
  medium: {
    tier: "medium",
    kind: "meteor",
    score: 2,
    sizePx: 8,
    color: "#f97316",
    glow: "0 0 10px #fb923c",
    particleCount: 12,
    soundHz: 740,
  },
  large: {
    tier: "large",
    kind: "meteor",
    score: 3,
    sizePx: 12,
    color: "#22d3ee",
    glow: "0 0 14px #22d3ee",
    particleCount: 18,
    soundHz: 820,
  },
  epic: {
    tier: "epic",
    kind: "golden_apple",
    score: 20,
    sizePx: 22,
    color: "#a855f7",
    glow: "0 0 20px #c084fc",
    particleCount: 24,
    soundHz: 980,
  },
  death: {
    tier: "death",
    kind: "golden_apple",
    score: 20,
    sizePx: 12,
    color: "#ef4444",
    glow: "0 0 12px #f87171",
    particleCount: 20,
    soundHz: 900,
  },
};

/** Weighted roll — Sprint 8.1: Small 55% / Medium 25% / Large 15% / Epic 5% */
export function rollFoodTier(): FoodTier {
  const r = Math.random();
  if (r < 0.55) return "small";
  if (r < 0.8) return "medium";
  if (r < 0.95) return "large";
  return "epic";
}

export function tierFromKind(kind: FoodKind, value: number): FoodTier {
  if (value >= 18 || kind === "golden_apple" && value >= 15) return value >= 18 ? "death" : "epic";
  if (value >= 8) return "large";
  if (value >= 3) return "medium";
  return "small";
}

export function getFoodVisual(tier: FoodTier): FoodTierConfig {
  return FOOD_TIERS[tier];
}
