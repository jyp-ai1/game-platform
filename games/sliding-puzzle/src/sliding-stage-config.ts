/** Sliding puzzle grid — Easy 8 · Normal 15 · Hard 24. */
export type SlidingDifficulty = "EASY" | "MEDIUM" | "HARD";

export const SLIDING_DIFFICULTIES: SlidingDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export function gridSizeForDifficulty(d: SlidingDifficulty): number {
  switch (d) {
    case "EASY":
      return 3;
    case "MEDIUM":
      return 4;
    case "HARD":
      return 5;
  }
}

export function difficultyLabel(d: SlidingDifficulty): string {
  return d === "EASY" ? "Easy" : d === "MEDIUM" ? "Normal" : "Hard";
}
