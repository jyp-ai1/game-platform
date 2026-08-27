/**
 * Server-safe MP difficulty constants (no "use client").
 * Shared by detail pages, catalog metadata, and entry lobby UI.
 */
export type MpAiDifficulty = "easy" | "normal" | "hard";

export const MP_AI_DIFFICULTIES: readonly {
  id: MpAiDifficulty;
  label: string;
  emoji: string;
}[] = [
  { id: "easy", label: "Easy", emoji: "🟢" },
  { id: "normal", label: "Normal", emoji: "🟡" },
  { id: "hard", label: "Hard", emoji: "🔴" },
] as const;

export const DEFAULT_MP_AI_DIFFICULTY: MpAiDifficulty = "normal";
