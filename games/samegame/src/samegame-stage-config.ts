/** SameGame board dimensions per difficulty. */
export type SameGameDifficulty = "EASY" | "MEDIUM" | "HARD";

export const SAMEGAME_DIFFICULTIES: SameGameDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export function boardSizeForDifficulty(d: SameGameDifficulty): { rows: number; cols: number } {
  switch (d) {
    case "EASY":
      return { rows: 8, cols: 6 };
    case "MEDIUM":
      return { rows: 10, cols: 8 };
    case "HARD":
      return { rows: 12, cols: 10 };
  }
}

export function difficultyLabel(d: SameGameDifficulty): string {
  return d === "EASY" ? "Easy" : d === "MEDIUM" ? "Normal" : "Hard";
}
