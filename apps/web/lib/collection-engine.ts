/**
 * Universal Collection — genre shelf progress (Replay OS).
 */
import type { Game } from "@game-platform/shared";
import { getGamePlayCounts } from "@game-platform/game-sdk";

import { getCompleted, getMastered } from "@/lib/library-store";

export interface GenreCollection {
  genre: string;
  label: string;
  emoji: string;
  completed: number;
  total: number;
  percent: number;
}

const GENRE_META: Record<string, { label: string; emoji: string }> = {
  puzzle: { label: "Puzzle", emoji: "🧩" },
  arcade: { label: "Action", emoji: "🕹️" },
  board: { label: "Board", emoji: "♟️" },
  sports: { label: "Sports", emoji: "⚽" },
  casual: { label: "Casual", emoji: "🎮" },
  brain: { label: "Memory", emoji: "🧠" },
};

export function getGenreCollections(games: Game[]): GenreCollection[] {
  const completed = new Set([...getCompleted(), ...getMastered()]);
  const counts = getGamePlayCounts();
  const byGenre = new Map<string, { total: number; done: number }>();

  for (const game of games) {
    if (game.status !== "ACTIVE") continue;
    const genre = game.category?.slug ?? "casual";
    const entry = byGenre.get(genre) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (completed.has(game.slug) || (counts[game.slug] ?? 0) >= 3) {
      entry.done += 1;
    }
    byGenre.set(genre, entry);
  }

  return [...byGenre.entries()]
    .map(([genre, { total, done }]) => {
      const meta = GENRE_META[genre] ?? { label: genre, emoji: "🎮" };
      return {
        genre,
        label: meta.label,
        emoji: meta.emoji,
        completed: done,
        total,
        percent: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

export function getOverallCollectionPercent(games: Game[]): number {
  const cols = getGenreCollections(games);
  if (cols.length === 0) return 0;
  const sum = cols.reduce((s, c) => s + c.percent, 0);
  return Math.round(sum / cols.length);
}
