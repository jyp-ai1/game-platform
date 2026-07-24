import type { Difficulty } from "@game-platform/shared";

export const difficultyVariant: Record<
  Difficulty,
  "secondary" | "outline" | "destructive"
> = {
  EASY: "secondary",
  MEDIUM: "outline",
  HARD: "destructive",
};

/** Normalized display labels (Easy · Normal · Hard). */
export const difficultyLabel: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Normal",
  HARD: "Hard",
};

export function formatDifficulty(difficulty: Difficulty): string {
  return difficultyLabel[difficulty];
}
