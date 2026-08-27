/**
 * Local MVP games that may ship before a Supabase catalog row exists.
 * Always prefer committed public thumbs so Preview never depends on DB cover URLs.
 * MP-GAME-STANDARD-001 — Creator-prep: difficulty + gameType on local MVP.
 */
import type { Game } from "@game-platform/shared";
import {
  buildCreatorGameMeta,
  type CreatorGameMeta,
  type SessionDifficulty,
} from "@game-platform/game-sdk/src/game-metadata";

/** Cache-bust so browsers / Kakao OG cache that stored a prior miss refetch. */
export const LOCAL_GAME_THUMBS: Record<string, string> = {
  bomber: "/images/games/bomber.png?v=2",
  agar: "/images/games/agar.png?v=2",
  snake: "/images/games/snake.png?v=2",
};

/** Intrinsic sizes for og:image:width / height (static public thumbs). */
export const LOCAL_GAME_OG_DIMS: Record<string, { width: number; height: number }> = {
  snake: { width: 1024, height: 576 },
  agar: { width: 1024, height: 1024 },
  bomber: { width: 1280, height: 800 },
};

const LOCAL_MVP_META: Record<
  string,
  Pick<Game, "title" | "description" | "tags"> & {
    /** Session default — Normal for Closed Alpha MP. */
    sessionDifficulty: SessionDifficulty;
    controls: string;
  }
> = {
  bomber: {
    title: "Bomber",
    description: "캐릭터 · 색상 선택 후 바로 참가. 폭탄을 놓고 살아남으세요.",
    tags: ["multiplayer", "realtime"],
    sessionDifficulty: "normal",
    controls: "Arrow / WASD move · Space bomb",
  },
  agar: {
    title: "Agar",
    description: "세포를 키우고 Split으로 사냥하세요. Space = Split.",
    tags: ["multiplayer", "realtime"],
    sessionDifficulty: "normal",
    controls: "Pointer aim · Space Split · W Eject",
  },
  snake: {
    title: "Snake",
    description: "캐릭터 · 색상 선택 후 ENTER WORLD. 보석을 먹고 살아남으세요.",
    tags: ["multiplayer", "realtime"],
    sessionDifficulty: "normal",
    controls: "Pointer / keys move · Space / click Boost",
  },
};

export function resolveLocalThumb(
  slug: string,
  fromDb?: string | null
): string | null {
  return LOCAL_GAME_THUMBS[slug] ?? fromDb ?? null;
}

export function buildLocalMvpGame(slug: string): Game | null {
  const meta = LOCAL_MVP_META[slug];
  if (!meta) return null;
  const now = new Date().toISOString();
  return {
    id: `local-mvp-${slug}`,
    slug,
    title: meta.title,
    description: meta.description,
    thumbnailUrl: resolveLocalThumb(slug),
    // Catalog Difficulty stays MEDIUM (= Normal session) for MVP multiplayer.
    difficulty: "MEDIUM",
    status: "ACTIVE",
    sortOrder: 900,
    categoryId: null,
    category: null,
    isFeatured: true,
    tags: meta.tags,
    howToPlay: meta.controls,
    playCount: 0,
    nostalgiaNote: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Creator-prep shape for local MVP slugs (no DB). */
export function buildLocalMvpCreatorMeta(slug: string): CreatorGameMeta | null {
  const meta = LOCAL_MVP_META[slug];
  if (!meta) return null;
  return buildCreatorGameMeta({
    slug,
    title: meta.title,
    thumbnail: resolveLocalThumb(slug),
    description: meta.description,
    category: "multiplayer",
    difficulty: meta.sessionDifficulty,
    controls: meta.controls,
    creator: "Replay Studio",
    plays: 0,
    popularity: "🔥 LIVE",
  });
}

/** Prefer DB row; fill missing MVP slugs; always force known local thumbs. */
export function mergeLocalMvpGames(
  games: Game[],
  mvpSlugs: readonly string[] = ["bomber", "agar", "snake"]
): Game[] {
  const bySlug = new Map(games.map((g) => [g.slug, g]));
  for (const slug of mvpSlugs) {
    if (!bySlug.has(slug)) {
      const local = buildLocalMvpGame(slug);
      if (local) bySlug.set(slug, local);
    }
  }
  return [...bySlug.values()].map((g) => {
    const forced = LOCAL_GAME_THUMBS[g.slug];
    if (!forced || g.thumbnailUrl === forced) return g;
    return { ...g, thumbnailUrl: forced };
  });
}

export function getGameOrLocalMvp(
  games: Game[],
  slug: string
): Game | null {
  const fromList = games.find((g) => g.slug === slug);
  if (fromList) {
    const forced = LOCAL_GAME_THUMBS[slug];
    return forced && fromList.thumbnailUrl !== forced
      ? { ...fromList, thumbnailUrl: forced }
      : fromList;
  }
  return buildLocalMvpGame(slug);
}
