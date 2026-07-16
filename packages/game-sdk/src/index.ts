import type { Difficulty, GameStatus } from "@game-platform/shared";

export interface GameModule {
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  difficulty: Difficulty;
  status: GameStatus;
  sortOrder: number;
}

const registry = new Map<string, GameModule>();

export function registerGame(game: GameModule): void {
  registry.set(game.slug, game);
}

export function getGames(): GameModule[] {
  return Array.from(registry.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getGameBySlug(slug: string): GameModule | undefined {
  return registry.get(slug);
}
