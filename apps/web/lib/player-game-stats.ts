/**
 * Sprint 20 — per-game player stats for MY PAGE (localStorage; Supabase-ready shape).
 * Structure supports future TOP10 / Popular / Recent without fake AI.
 */
import type { Game } from "@game-platform/shared";
import { getBestScore, getGamePlayCounts } from "@game-platform/game-sdk";

import {
  getFavoritesSnapshot,
  getLastPlayedAt,
  getRecentlyPlayedSnapshot,
} from "@/lib/local-storage";

export type PlayerGameStat = {
  slug: string;
  title: string;
  playCount: number;
  bestScore: number;
  /** Alias for length-style games (Snake) — same local best for now. */
  bestLength: number;
  lastPlayedAt: string | null;
  favorite: boolean;
};

export type MyPageSnapshot = {
  recentPlays: PlayerGameStat[];
  favorites: PlayerGameStat[];
  allPlayed: PlayerGameStat[];
};

function statForSlug(slug: string, games: Game[], playCounts: Record<string, number>): PlayerGameStat {
  const game = games.find((g) => g.slug === slug);
  const best = getBestScore(slug);
  return {
    slug,
    title: game?.title ?? slug,
    playCount: playCounts[slug] ?? 0,
    bestScore: best,
    bestLength: best,
    lastPlayedAt: getLastPlayedAt(slug),
    favorite: getFavoritesSnapshot().includes(slug),
  };
}

export function buildMyPageSnapshot(games: Game[]): MyPageSnapshot {
  const playCounts = getGamePlayCounts();
  const recentSlugs = getRecentlyPlayedSnapshot();
  const favSlugs = getFavoritesSnapshot();
  const playedSlugs = Array.from(
    new Set([...Object.keys(playCounts), ...recentSlugs, ...favSlugs])
  ).filter((slug) => (playCounts[slug] ?? 0) > 0 || recentSlugs.includes(slug));

  const recentPlays = recentSlugs.map((slug) => statForSlug(slug, games, playCounts));
  const favorites = favSlugs.map((slug) => statForSlug(slug, games, playCounts));
  const allPlayed = playedSlugs
    .map((slug) => statForSlug(slug, games, playCounts))
    .sort((a, b) => {
      const at = a.lastPlayedAt ?? "";
      const bt = b.lastPlayedAt ?? "";
      return bt.localeCompare(at);
    });

  return { recentPlays, favorites, allPlayed };
}

/** Honest ranking seed for catalog Popular/Recent (playCount + lastPlayed). */
export function rankingHintsFromLocal(games: Game[]): {
  popularSlugs: string[];
  recentSlugs: string[];
} {
  const playCounts = getGamePlayCounts();
  const popularSlugs = [...games]
    .map((g) => ({ slug: g.slug, n: Math.max(g.playCount ?? 0, playCounts[g.slug] ?? 0) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 20)
    .map((x) => x.slug);
  return {
    popularSlugs,
    recentSlugs: getRecentlyPlayedSnapshot(),
  };
}
