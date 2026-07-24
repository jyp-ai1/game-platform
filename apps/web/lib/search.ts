import type { Game } from "@game-platform/shared";

import { getGameBalanceMeta } from "@/lib/game-balance";
import { formatDifficulty } from "@/lib/difficulty";

function matchScore(game: Game, q: string): number {
  const title = game.title.toLowerCase();
  const slug = game.slug.replace(/-/g, " ");
  const desc = game.description.toLowerCase();
  const howTo = game.howToPlay?.toLowerCase() ?? "";
  const balance = getGameBalanceMeta(game.slug, game.difficulty);
  const diffLabel = formatDifficulty(game.difficulty).toLowerCase();
  const session = balance.sessionType;

  if (title === q) return 100;
  if (title.startsWith(q)) return 90;
  if (slug === q) return 85;
  if (title.includes(q)) return 80;
  if (slug.includes(q)) return 75;
  if (game.tags.some((tag) => tag.toLowerCase() === q)) return 70;
  if (game.tags.some((tag) => tag.toLowerCase().includes(q))) return 65;
  if (diffLabel.includes(q) || q === diffLabel) {
    return 60;
  }
  if (q === "quick" || q === "quick play" || q === "짧은") {
    if (session === "quick") return 55;
  }
  if (q === "long" || q === "long play" || q === "긴") {
    if (session === "long") return 55;
  }
  if (balance.playTimeLabel.toLowerCase().includes(q)) return 50;
  if (game.category?.name.toLowerCase().includes(q)) return 45;
  if (game.category?.slug.toLowerCase().includes(q)) return 45;
  if (howTo.includes(q)) return 40;
  if (desc.includes(q)) return 30;
  return 0;
}

export function searchGames(games: Game[], query: string): Game[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return games;
  }

  return games
    .map((game) => ({ game, score: matchScore(game, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.game.playCount - a.game.playCount)
    .map(({ game }) => game);
}
