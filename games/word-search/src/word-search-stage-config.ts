/** Word search grid + word count per difficulty. */
export type WordSearchDifficulty = "EASY" | "MEDIUM" | "HARD";

export const WORD_SEARCH_DIFFICULTIES: WordSearchDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export interface WordSearchLevelDef {
  size: number;
  words: readonly string[];
  label: string;
}

export function levelForDifficulty(d: WordSearchDifficulty): WordSearchLevelDef {
  switch (d) {
    case "EASY":
      return { size: 8, words: ["GAME", "PLAY", "FUN", "WIN"], label: "Easy" };
    case "MEDIUM":
      return {
        size: 10,
        words: ["GAME", "PLAY", "FUN", "WIN", "CODE", "FIND"],
        label: "Normal",
      };
    case "HARD":
      return {
        size: 12,
        words: ["GAME", "PLAY", "FUN", "WIN", "CODE", "FIND", "WORD", "HUNT"],
        label: "Hard",
      };
  }
}

export function difficultyLabel(d: WordSearchDifficulty): string {
  return levelForDifficulty(d).label;
}
