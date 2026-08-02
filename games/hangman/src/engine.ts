import {
  type HangmanDifficulty,
  maxWrongForDifficulty,
  wordLengthRange,
} from "./hangman-stage-config";

export const WORD_LIST: string[] = [
  "ARCADE",
  "PIXEL",
  "JOYSTICK",
  "RETRO",
  "CONSOLE",
  "PUZZLE",
  "VICTORY",
  "CHAMPION",
  "GALAXY",
  "ROCKET",
  "TREASURE",
  "DUNGEON",
  "WIZARD",
  "CASTLE",
  "DRAGON",
  "KNIGHT",
  "QUEST",
  "LEVEL",
  "COMBO",
  "TRIVIA",
  "MAZE",
  "GOBLIN",
  "POTION",
  "SHIELD",
  "SPRITE",
  "CONTROLLER",
  "HIGHSCORE",
  "PLATFORM",
  "BONUS",
  "CHECKPOINT",
  "AVATAR",
  "MONSTER",
  "LEGEND",
  "PORTAL",
  "ROBOT",
];

export interface HangmanState {
  word: string;
  guessedLetters: string[];
  wrongGuesses: number;
  maxWrongGuesses: number;
  difficulty: HangmanDifficulty;
  status: "playing" | "won" | "lost";
}

export function pickRandomWord(difficulty: HangmanDifficulty = "MEDIUM"): string {
  const [minLen, maxLen] = wordLengthRange(difficulty);
  const pool = WORD_LIST.filter((w) => w.length >= minLen && w.length <= maxLen);
  const list = pool.length > 0 ? pool : WORD_LIST;
  const index = Math.floor(Math.random() * list.length);
  return list[index]!;
}

export function createInitialState(difficulty: HangmanDifficulty = "MEDIUM"): HangmanState {
  return {
    word: pickRandomWord(difficulty),
    guessedLetters: [],
    wrongGuesses: 0,
    maxWrongGuesses: maxWrongForDifficulty(difficulty),
    difficulty,
    status: "playing",
  };
}

export function guessLetter(state: HangmanState, letter: string): HangmanState {
  const normalized = letter.toUpperCase();

  if (state.status !== "playing" || state.guessedLetters.includes(normalized)) {
    return state;
  }

  const guessedLetters = [...state.guessedLetters, normalized];

  if (!state.word.includes(normalized)) {
    const wrongGuesses = state.wrongGuesses + 1;
    const status = wrongGuesses >= state.maxWrongGuesses ? "lost" : "playing";
    return { ...state, guessedLetters, wrongGuesses, status };
  }

  const uniqueLetters = new Set(state.word.split(""));
  const won = [...uniqueLetters].every((ch) => guessedLetters.includes(ch));
  return { ...state, guessedLetters, status: won ? "won" : "playing" };
}

export function getDisplayWord(state: HangmanState): string {
  return state.word
    .split("")
    .map((ch) => (state.guessedLetters.includes(ch) ? ch : "_"))
    .join(" ");
}

export function computeScore(wrongGuesses: number): number {
  return Math.max(100, 1000 - wrongGuesses * 150);
}

export type { HangmanDifficulty };
