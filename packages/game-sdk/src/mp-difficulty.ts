/**
 * Server-safe MP difficulty constants (no "use client").
 * Shared by detail pages, catalog metadata, and entry lobby UI.
 * PLATFORM-UX-CONTRACT-001 — NORMAL / HARD / SUPER HARD only (no Easy in UI).
 */
export type MpAiDifficulty = "normal" | "hard" | "superhard";

export const MP_AI_DIFFICULTIES: readonly {
  id: MpAiDifficulty;
  label: string;
  emoji: string;
}[] = [
  { id: "normal", label: "NORMAL", emoji: "🟡" },
  { id: "hard", label: "HARD", emoji: "🟠" },
  { id: "superhard", label: "SUPER HARD", emoji: "🔴" },
] as const;

/** MP lobby has no difficulty picker — internal default one tier above Normal. */
export const DEFAULT_MP_AI_DIFFICULTY: MpAiDifficulty = "hard";

/** Per-game engine tiers — internal tuning only; UI never exposes Easy. */
export type EngineAiTier = "easy" | "normal" | "hard";

/** Map platform session difficulty → engine AI tier (Snake/Agar/Bomber internals). */
export function toEngineAiTier(tier: MpAiDifficulty): EngineAiTier {
  if (tier === "normal") return "normal";
  if (tier === "hard") return "hard";
  return "hard";
}
