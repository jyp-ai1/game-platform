/** Replay Snake — head character ids + body color/pattern (pattern unlocks via progression). */

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

/** Unlocked via progression later — only normal + panda stripe for now */
export type BodyPattern =
  | "normal"
  | "panda"
  | "grid"
  | "rainbow"
  | "fire"
  | "ice"
  | "galaxy"
  | "gold"
  | "neon";

export interface SnakeHeadCharacter {
  id: SnakeHeadId;
  label: string;
  emoji: string;
  bodyColor: string;
  bodyColorAlt?: string;
  bodyPattern: BodyPattern;
}

export const SNAKE_HEAD_CHARACTERS: Record<SnakeHeadId, SnakeHeadCharacter> = {
  frog: { id: "frog", label: "Frog", emoji: "🐸", bodyColor: "#22c55e", bodyPattern: "normal" },
  cat: { id: "cat", label: "Cat", emoji: "🐱", bodyColor: "#f97316", bodyPattern: "normal" },
  dog: { id: "dog", label: "Dog", emoji: "🐶", bodyColor: "#a16207", bodyPattern: "normal" },
  panda: {
    id: "panda",
    label: "Panda",
    emoji: "🐼",
    bodyColor: "#f1f5f9",
    bodyColorAlt: "#171717",
    bodyPattern: "panda",
  },
  fox: { id: "fox", label: "Fox", emoji: "🦊", bodyColor: "#ea580c", bodyPattern: "normal" },
  robot: { id: "robot", label: "Robot", emoji: "🤖", bodyColor: "#94a3b8", bodyPattern: "normal" },
  alien: { id: "alien", label: "Alien", emoji: "👽", bodyColor: "#84cc16", bodyPattern: "normal" },
  ghost: { id: "ghost", label: "Ghost", emoji: "👻", bodyColor: "#a855f7", bodyPattern: "normal" },
  penguin: { id: "penguin", label: "Penguin", emoji: "🐧", bodyColor: "#3b82f6", bodyPattern: "normal" },
  monkey: { id: "monkey", label: "Monkey", emoji: "🐵", bodyColor: "#eab308", bodyPattern: "normal" },
};

const STORAGE_KEY = "replay:snake-head-character";
const COLOR_STORAGE_KEY = "replay:snake-body-color";


export interface SnakeBodyAppearance {
  headCharacter?: string;
  bodyColor?: string;
  bodyColorAlt?: string;
  bodyPattern?: string;
  color: string;
}

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

/** Apply head + body appearance from character selection */
export function loadSnakeBodyColor(fallback?: string): string {
  if (typeof window === "undefined") return fallback ?? "#22c55e";
  const raw = window.localStorage.getItem(COLOR_STORAGE_KEY);
  return raw && /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : (fallback ?? "#22c55e");
}

export function saveSnakeBodyColor(color: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COLOR_STORAGE_KEY, color);
}

export function applyCharacterToSnake(
  snake: SnakeBodyAppearance,
  headId: SnakeHeadId,
  colorOverride?: string
): void {
  const c = SNAKE_HEAD_CHARACTERS[headId];
  snake.headCharacter = headId;
  snake.bodyColor = colorOverride || c.bodyColor;
  snake.bodyColorAlt = colorOverride ? undefined : c.bodyColorAlt;
  snake.bodyPattern = colorOverride ? "normal" : c.bodyPattern;
  snake.color = colorOverride || c.bodyColor;
}

export function segmentBodyColor(snake: SnakeBodyAppearance, segmentIndex: number): string {
  const base = snake.bodyColor ?? snake.color;
  if (snake.bodyPattern === "panda" && snake.bodyColorAlt && segmentIndex % 2 === 1) {
    return snake.bodyColorAlt;
  }
  return base;
}
