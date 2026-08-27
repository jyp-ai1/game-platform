/**
 * Lightweight Creator-prep metadata (catalog / local-mvp — no DB).
 * Session difficulty is shared across Snake / Agar / Bomber shells.
 */
import {
  DEFAULT_MP_AI_DIFFICULTY,
  type MpAiDifficulty,
} from "./mp-difficulty";

export type GameType = "multiplayer" | "singleplayer";

/** Alias — same as MpAiDifficulty; user-facing Easy / Normal / Hard. */
export type SessionDifficulty = MpAiDifficulty;

export type CreatorGameMeta = {
  slug: string;
  title: string;
  thumbnail?: string | null;
  description?: string;
  category?: string | null;
  /** Catalog / session default. */
  difficulty: SessionDifficulty;
  gameType: GameType;
  multiplayer: boolean;
  controls?: string;
  creator?: string;
  comments?: number;
  plays?: number;
  popularity?: string;
};

const MP_SLUGS = new Set(["snake", "agar", "bomber"]);

/** Map legacy catalog Difficulty (EASY/MEDIUM/HARD) → session difficulty. */
export function toSessionDifficulty(
  value: string | null | undefined
): SessionDifficulty {
  const v = (value ?? "").toLowerCase();
  if (v === "easy" || v === "e") return "easy";
  if (v === "hard" || v === "h") return "hard";
  if (v === "medium" || v === "med" || v === "m" || v === "normal" || v === "n") {
    return "normal";
  }
  return DEFAULT_MP_AI_DIFFICULTY;
}

export function resolveGameType(slug: string): GameType {
  return MP_SLUGS.has(slug) ? "multiplayer" : "singleplayer";
}

export function isMultiplayerGameSlug(slug: string): boolean {
  return MP_SLUGS.has(slug);
}

export function buildCreatorGameMeta(input: {
  slug: string;
  title: string;
  thumbnail?: string | null;
  description?: string;
  category?: string | null;
  difficulty?: string | null;
  controls?: string;
  creator?: string;
  comments?: number;
  plays?: number;
  popularity?: string;
}): CreatorGameMeta {
  const gameType = resolveGameType(input.slug);
  return {
    slug: input.slug,
    title: input.title,
    thumbnail: input.thumbnail ?? null,
    description: input.description,
    category: input.category ?? null,
    difficulty: toSessionDifficulty(input.difficulty),
    gameType,
    multiplayer: gameType === "multiplayer",
    controls: input.controls,
    creator: input.creator ?? (gameType === "multiplayer" ? "Replay Studio" : "Community"),
    comments: input.comments,
    plays: input.plays,
    popularity: input.popularity,
  };
}
