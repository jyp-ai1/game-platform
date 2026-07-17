import type { Difficulty } from "@game-platform/shared";

export const difficultyVariant: Record<
  Difficulty,
  "secondary" | "outline" | "destructive"
> = {
  EASY: "secondary",
  MEDIUM: "outline",
  HARD: "destructive",
};
