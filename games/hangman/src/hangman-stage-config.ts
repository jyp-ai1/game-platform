/** Hangman difficulty — word length + lives per original hangman variants. */
export type HangmanDifficulty = "EASY" | "MEDIUM" | "HARD";

export const HANGMAN_DIFFICULTIES: HangmanDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export function maxWrongForDifficulty(d: HangmanDifficulty): number {
  switch (d) {
    case "EASY":
      return 8;
    case "MEDIUM":
      return 6;
    case "HARD":
      return 4;
  }
}

export function wordLengthRange(d: HangmanDifficulty): [number, number] {
  switch (d) {
    case "EASY":
      return [4, 6];
    case "MEDIUM":
      return [6, 8];
    case "HARD":
      return [8, 12];
  }
}

export function difficultyLabel(d: HangmanDifficulty): string {
  return d === "EASY" ? "Easy" : d === "MEDIUM" ? "Normal" : "Hard";
}
