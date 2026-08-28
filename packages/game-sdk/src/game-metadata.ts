/**
 * Lightweight Creator-prep metadata (catalog / local-mvp — no DB).
 * Session difficulty is shared across Snake / Agar / Bomber shells.
 */
import {
  DEFAULT_MP_AI_DIFFICULTY,
  type MpAiDifficulty,
} from "./mp-difficulty";

export type GameType = "multiplayer" | "singleplayer";

/** Alias — same as MpAiDifficulty; user-facing NORMAL / HARD / SUPER HARD. */
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

  /** Creator placeholder — metadata-only slug for shared detail template. */
const CREATOR_STUB_SLUGS = new Set(["creator-demo"]);

const MP_SLUGS = new Set(["snake", "agar", "bomber"]);
const CREATOR_MP_SLUGS = new Set<string>();

/** Sprint 23 — web registry registers published creator MP slugs at catalog merge. */
export function setCreatorMultiplayerSlugs(slugs: readonly string[]): void {
  CREATOR_MP_SLUGS.clear();
  for (const s of slugs) CREATOR_MP_SLUGS.add(s);
}

export function getCreatorMultiplayerSlugs(): readonly string[] {
  return [...CREATOR_MP_SLUGS];
}

/** Map legacy catalog Difficulty (EASY/MEDIUM/HARD) → session difficulty. Easy → normal. */
export function toSessionDifficulty(
  value: string | null | undefined
): SessionDifficulty {
  const v = (value ?? "").toLowerCase();
  if (v === "superhard" || v === "super-hard" || v === "super_hard" || v === "insane") {
    return "superhard";
  }
  if (v === "hard" || v === "h") return "hard";
  if (
    v === "easy" ||
    v === "e" ||
    v === "medium" ||
    v === "med" ||
    v === "m" ||
    v === "normal" ||
    v === "n"
  ) {
    return "normal";
  }
  return DEFAULT_MP_AI_DIFFICULTY;
}

export function resolveGameType(slug: string): GameType {
  if (CREATOR_STUB_SLUGS.has(slug)) return "singleplayer";
  if (MP_SLUGS.has(slug) || CREATOR_MP_SLUGS.has(slug)) return "multiplayer";
  return "singleplayer";
}

export function isMultiplayerGameSlug(slug: string): boolean {
  return MP_SLUGS.has(slug) || CREATOR_MP_SLUGS.has(slug);
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
