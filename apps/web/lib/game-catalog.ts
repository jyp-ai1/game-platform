/**
 * Sprint17 STEP6 — minimal catalog view-model (no new DB schema).
 * Maps existing Game rows into a catalog entry Snake/Agar can share.
 * MP-GAME-STANDARD-001 — Creator-prep fields: difficulty + gameType.
 */
import type { Game } from "@game-platform/shared";
import {
  buildCreatorGameMeta,
  toSessionDifficulty,
  type CreatorGameMeta,
  type GameType,
  type SessionDifficulty,
} from "@game-platform/game-sdk/src/game-metadata";
import { getGameTier, REALTIME_GAMES } from "@game-platform/multiplayer-sdk";

export type CatalogPlayMode = "single" | "party" | "realtime";

export interface GameCatalogEntry {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: Game["status"];
  tags: string[];
  playMode: CatalogPlayMode;
  /** Primary CTA path for home / multiplayer cards */
  playHref: string;
  isFlagship: boolean;
  /** Creator-prep — session Easy/Normal/Hard (default Normal). */
  difficulty: SessionDifficulty;
  gameType: GameType;
  multiplayer: boolean;
  thumbnailUrl: string | null;
  category: string | null;
  creator: string;
  plays: number;
}

/** Home / catalog cards land here — Detail only, never Character lobby. */
export function detailHrefForCatalogSlug(slug: string): string {
  return `/games/${slug}`;
}

/**
 * Sprint 18 / 21 — invite lands on Detail first (pin room), then WORLD PLAY.
 * Never deep-link guests past Detail into a bare WORLD cluster resolve.
 */
export function inviteHrefForCatalogSlug(slug: string, roomCode: string): string {
  const code = roomCode.trim().toUpperCase();
  return `/games/${slug}?invite=${encodeURIComponent(code)}&source=invite`;
}

/** PLATFORM-UX-CONTRACT-002 — unified card / detail CTA copy. */
export const REPLAY_CARD_CTA = "▶ Re:Play";
export const REPLAY_DETAIL_WORLD_CTA = "▶ WORLD PLAY";
export const REPLAY_DETAIL_SOLO_CTA = "▶ PLAY";

export function playHrefForCatalogSlug(slug: string): string {
  // Detail CTA → Character/Color entry (flagship Snake or /games/{slug}/play).
  if (slug === "snake") return "/flagship/snake-io/play?room=WORLD";
  if (slug === "agar") return "/games/agar/play?room=WORLD";
  if (slug === "bomber") return "/games/bomber/play?room=WORLD";
  return `/games/${slug}/play`;
}

function creatorForSlug(slug: string, gameType: GameType): string {
  if (gameType === "multiplayer") return "Replay Studio";
  return "Community";
}

/** Represent an existing Game row in the catalog model. */
export function toGameCatalogEntry(game: Game): GameCatalogEntry {
  const playMode = getGameTier(game.slug) as CatalogPlayMode;
  const meta: CreatorGameMeta = buildCreatorGameMeta({
    slug: game.slug,
    title: game.title,
    thumbnail: game.thumbnailUrl,
    description: game.description,
    category: game.category?.name ?? null,
    difficulty: game.difficulty,
    creator: undefined,
    plays: game.playCount,
  });
  return {
    id: game.id,
    slug: game.slug,
    title: game.title,
    description: game.description,
    status: game.status,
    tags: game.tags,
    playMode: REALTIME_GAMES.has(game.slug) ? "realtime" : playMode,
    playHref: playHrefForCatalogSlug(game.slug),
    isFlagship: game.slug === "snake" || game.isFeatured,
    difficulty: meta.difficulty,
    gameType: meta.gameType,
    multiplayer: meta.multiplayer,
    thumbnailUrl: game.thumbnailUrl,
    category: game.category?.name ?? null,
    creator: creatorForSlug(game.slug, meta.gameType),
    plays: game.playCount ?? 0,
  };
}

/** Snake is representable when ACTIVE (or featured) with realtime play href. */
export function snakeCatalogReady(games: Game[]): {
  ok: boolean;
  entry: GameCatalogEntry | null;
} {
  const snake = games.find((g) => g.slug === "snake") ?? null;
  if (!snake) return { ok: false, entry: null };
  const entry = toGameCatalogEntry(snake);
  const ok =
    entry.slug === "snake" &&
    !!entry.title &&
    entry.playHref.includes("snake") &&
    (entry.status === "ACTIVE" || entry.isFlagship);
  return { ok, entry };
}

export { toSessionDifficulty };
export type { CreatorGameMeta, GameType, SessionDifficulty };
