/** Replay Snake — head character ids (body shared). */

export const SNAKE_HEAD_IDS = [
  "frog",
  "panda",
  "cat",
  "dog",
  "fox",
  "robot",
  "alien",
  "ghost",
  "penguin",
  "monkey",
] as const;

export type SnakeHeadId = (typeof SNAKE_HEAD_IDS)[number];

export interface SnakeHeadCharacter {
  id: SnakeHeadId;
  label: string;
  emoji: string;
}

export const SNAKE_HEAD_CHARACTERS: Record<SnakeHeadId, SnakeHeadCharacter> = {
  frog: { id: "frog", label: "Frog", emoji: "🐸" },
  panda: { id: "panda", label: "Panda", emoji: "🐼" },
  cat: { id: "cat", label: "Cat", emoji: "🐱" },
  dog: { id: "dog", label: "Dog", emoji: "🐶" },
  fox: { id: "fox", label: "Fox", emoji: "🦊" },
  robot: { id: "robot", label: "Robot", emoji: "🤖" },
  alien: { id: "alien", label: "Alien", emoji: "👽" },
  ghost: { id: "ghost", label: "Ghost", emoji: "👻" },
  penguin: { id: "penguin", label: "Penguin", emoji: "🐧" },
  monkey: { id: "monkey", label: "Monkey", emoji: "🐵" },
};

const STORAGE_KEY = "replay:snake-head-character";

export function isSnakeHeadId(v: string): v is SnakeHeadId {
  return (SNAKE_HEAD_IDS as readonly string[]).includes(v);
}

export function loadSnakeHeadCharacter(): SnakeHeadId {
  if (typeof window === "undefined") return "frog";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw && isSnakeHeadId(raw) ? raw : "frog";
}

export function saveSnakeHeadCharacter(id: SnakeHeadId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
}

export function randomSnakeHeadId(seed: number): SnakeHeadId {
  return SNAKE_HEAD_IDS[Math.abs(seed) % SNAKE_HEAD_IDS.length]!;
}

export function resolveHeadEmoji(headId?: string): string {
  if (headId && isSnakeHeadId(headId)) return SNAKE_HEAD_CHARACTERS[headId].emoji;
  return "🐍";
}
