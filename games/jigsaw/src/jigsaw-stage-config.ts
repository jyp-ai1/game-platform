/** Jigsaw (N-puzzle) grid sizes — Easy 8-puzzle · Normal 15 · Hard 24. */
export type JigsawDifficulty = "EASY" | "MEDIUM" | "HARD";

export const JIGSAW_DIFFICULTIES: JigsawDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export function gridSizeForDifficulty(d: JigsawDifficulty): number {
  switch (d) {
    case "EASY":
      return 3;
    case "MEDIUM":
      return 4;
    case "HARD":
      return 5;
  }
}

export function difficultyLabel(d: JigsawDifficulty): string {
  return d === "EASY" ? "Easy" : d === "MEDIUM" ? "Normal" : "Hard";
}
