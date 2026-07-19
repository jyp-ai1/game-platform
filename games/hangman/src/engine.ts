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
  status: "playing" | "won" | "lost";
}

export function pickRandomWord(): string {
  const index = Math.floor(Math.random() * WORD_LIST.length);
  return WORD_LIST[index]!;
}

export function createInitialState(): HangmanState {
  return {
    word: pickRandomWord(),
    guessedLetters: [],
    wrongGuesses: 0,
    maxWrongGuesses: 6,
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
