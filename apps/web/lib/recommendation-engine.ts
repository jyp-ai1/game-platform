/**
 * Rule-based recommendation engine — Project Phoenix Phase 1.
 * KPI: Retention + Session Time + Identity.
 */
import type { Game } from "@game-platform/shared";

import { selectRecommended } from "@/lib/game-sections";

export interface RecommendationContext {
  recentlyPlayed: string[];
  favorites: string[];
  streak: number;
  missionIncomplete: boolean;
  replayScore: number;
  playCounts: Record<string, number>;
  hourOfDay?: number;
}

export interface ScoredGame {
  game: Game;
  score: number;
  reason: string;
}

function categoryAffinity(
  games: Game[],
  recentlyPlayed: string[]
): Map<string, number> {
  const weights = new Map<string, number>();
  for (const slug of recentlyPlayed) {
    const g = games.find((x) => x.slug === slug);
    const cat = g?.category?.slug;
    if (cat) weights.set(cat, (weights.get(cat) ?? 0) + 1);
  }
  return weights;
}

export function scoreGames(
  games: Game[],
  ctx: RecommendationContext
): ScoredGame[] {
  const recentSet = new Set(ctx.recentlyPlayed);
  const favSet = new Set(ctx.favorites);
  const affinity = categoryAffinity(games, ctx.recentlyPlayed);
  const hour = ctx.hourOfDay ?? new Date().getHours();
  const quickSession = hour >= 22 || hour <= 7;

  return games
    .filter((g) => g.status === "ACTIVE" && !recentSet.has(g.slug))
    .map((g) => {
      let score = g.playCount * 0.5;
      let reason = "Popular";

      if (favSet.has(g.slug)) {
        score += 60;
        reason = "Favorite genre";
      }
      const cat = g.category?.slug;
      if (cat && affinity.has(cat)) {
        score += (affinity.get(cat) ?? 0) * 25;
        reason = "Because you played similar";
      }
      if (g.isFeatured) score += 12;
      if (ctx.missionIncomplete && g.difficulty === "EASY") {
        score += 20;
        reason = "Quick win for mission";
      }
      if (ctx.streak >= 3 && g.tags.includes("quick-play")) {
        score += 15;
        reason = "Keep your streak";
      }
      if (quickSession && (g.difficulty === "EASY" || g.category?.slug === "casual")) {
        score += 18;
        reason = "Quick session";
      }
      if (ctx.replayScore < 200 && g.playCount > 100) {
        score += 10;
        reason = "Trending for newcomers";
      }
      const myPlays = ctx.playCounts[g.slug] ?? 0;
      if (myPlays > 0 && myPlays < 3) {
        score += 30;
        reason = "Continue exploring";
      }
      if (g.tags.includes("arcade-classic")) score += 8;

      return { game: g, score, reason };
    })
    .sort((a, b) => b.score - a.score);
}

export function recommendGames(
  games: Game[],
  ctx: RecommendationContext,
  limit = 8
): Game[] {
  const scored = scoreGames(games, ctx);
  if (scored.length >= limit) {
    return scored.slice(0, limit).map((s) => s.game);
  }
  const fallback = selectRecommended(
    games,
    ctx.recentlyPlayed,
    ctx.favorites,
    limit
  );
  const picked = new Set(scored.map((s) => s.game.slug));
  for (const g of fallback) {
    if (scored.length >= limit) break;
    if (!picked.has(g.slug)) {
      scored.push({ game: g, score: 0, reason: "Recommended" });
      picked.add(g.slug);
    }
  }
  return scored.slice(0, limit).map((s) => s.game);
}

export function topRecommendationReason(
  games: Game[],
  ctx: RecommendationContext
): string {
  return scoreGames(games, ctx)[0]?.reason ?? "For you";
}
