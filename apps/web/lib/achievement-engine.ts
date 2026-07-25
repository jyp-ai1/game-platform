/**
 * Per-game achievement definitions — Track J.
 */
import { getBestScore, getAchievements } from "@game-platform/game-sdk";

export interface GameAchievementDef {
  id: string;
  title: string;
  description: string;
  check: (slug: string, score?: number) => boolean;
}

const PER_GAME: Record<string, GameAchievementDef[]> = {
  snake: [
    { id: "snake-1k", title: "Serpent", description: "Score 1,000", check: (s) => getBestScore(s) >= 1000 },
    { id: "snake-5k", title: "Python", description: "Score 5,000", check: (s) => getBestScore(s) >= 5000 },
    { id: "snake-10k", title: "Anaconda", description: "Score 10,000", check: (s) => getBestScore(s) >= 10000 },
  ],
  "2048": [
    { id: "2048-512", title: "Half Way", description: "Reach 512", check: (s) => getBestScore(s) >= 512 },
    { id: "2048-2048", title: "2048 Master", description: "Reach 2048", check: (s) => getBestScore(s) >= 2048 },
    { id: "2048-4096", title: "Beyond", description: "Reach 4096", check: (s) => getBestScore(s) >= 4096 },
  ],
  memory: [
    { id: "mem-round-1", title: "First Match", description: "Complete round 1", check: (s) => getBestScore(s) >= 1 },
    { id: "mem-round-3", title: "Sharp Mind", description: "Reach grid 4×4", check: (s) => getBestScore(s) >= 3 },
  ],
  sudoku: [
    { id: "sudoku-easy", title: "Easy Clear", description: "Complete Easy", check: (s) => getBestScore(s) >= 1 },
    { id: "sudoku-hard", title: "Expert", description: "Reach Expert", check: (s) => getBestScore(s) >= 4 },
  ],
};

const DEFAULT_ACHIEVEMENTS: GameAchievementDef[] = [
  { id: "first-play", title: "First Steps", description: "Play once", check: (s) => getBestScore(s) > 0 },
  { id: "score-100", title: "Century", description: "Score 100+", check: (s) => getBestScore(s) >= 100 },
  { id: "score-500", title: "Rising Star", description: "Score 500+", check: (s) => getBestScore(s) >= 500 },
  { id: "score-1k", title: "Pro", description: "Score 1,000+", check: (s) => getBestScore(s) >= 1000 },
  { id: "score-5k", title: "Elite", description: "Score 5,000+", check: (s) => getBestScore(s) >= 5000 },
];

export function getGameAchievements(slug: string): GameAchievementDef[] {
  return PER_GAME[slug] ?? DEFAULT_ACHIEVEMENTS;
}

export function getUnlockedGameAchievements(slug: string): GameAchievementDef[] {
  return getGameAchievements(slug).filter((a) => a.check(slug));
}

export function getGameAchievementProgress(slug: string): { unlocked: number; total: number } {
  const all = getGameAchievements(slug);
  const unlocked = all.filter((a) => a.check(slug)).length;
  return { unlocked, total: all.length };
}

export function countGlobalAchievements(): number {
  return Object.keys(getAchievements()).length;
}
