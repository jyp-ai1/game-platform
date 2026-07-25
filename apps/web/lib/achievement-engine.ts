/**
 * Universal + per-game achievements (Replay OS).
 */
import {
  getBestScore,
  getAchievements,
  getTotalPlayCount,
} from "@game-platform/game-sdk";

import { getCurrentStage } from "@/lib/game-stages";

const PLATFORM_ACH_KEY = "play29:platform-achievements";

export interface GameAchievementDef {
  id: string;
  title: string;
  description: string;
  check: (slug: string, score?: number) => boolean;
}

export interface PlatformAchievementDef {
  id: string;
  title: string;
  titleKo: string;
  description: string;
  check: (slug: string, score: number) => boolean;
}

const PLATFORM_ACHIEVEMENTS: PlatformAchievementDef[] = [
  {
    id: "platform-100-plays",
    title: "Century Club",
    titleKo: "100판 플레이",
    description: "Play 100 games total",
    check: () => getTotalPlayCount() >= 100,
  },
  {
    id: "platform-50k-score",
    title: "Score Hunter",
    titleKo: "50000점",
    description: "Score 50,000 in one game",
    check: (_slug, score) => score >= 50000,
  },
  {
    id: "platform-stage-20",
    title: "Stage Master",
    titleKo: "Stage 20",
    description: "Reach stage 20 in any game",
    check: (slug, score) => {
      const stage = getCurrentStage(slug, score);
      return stage.index >= 5;
    },
  },
  {
    id: "platform-10k-best",
    title: "Elite Record",
    titleKo: "만점 도전",
    description: "Best score 10,000+ in any game",
    check: (slug) => getBestScore(slug) >= 10000,
  },
];

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
  return Object.keys(getAchievements()).length + readPlatformUnlocked().length;
}

function readPlatformUnlocked(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(PLATFORM_ACH_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function writePlatformUnlocked(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLATFORM_ACH_KEY, JSON.stringify(ids));
}

export function getPlatformAchievements(): PlatformAchievementDef[] {
  return PLATFORM_ACHIEVEMENTS;
}

export function getUnlockedPlatformAchievements(): PlatformAchievementDef[] {
  const unlocked = new Set(readPlatformUnlocked());
  return PLATFORM_ACHIEVEMENTS.filter((a) => unlocked.has(a.id));
}

export function getPlatformAchievementTitle(id: string): string {
  return PLATFORM_ACHIEVEMENTS.find((a) => a.id === id)?.titleKo ?? id;
}

/** Check and persist newly unlocked platform achievements after a game. */
export function checkPlatformAchievements(slug: string, score: number): string[] {
  const unlocked = new Set(readPlatformUnlocked());
  const newly: string[] = [];

  for (const ach of PLATFORM_ACHIEVEMENTS) {
    if (unlocked.has(ach.id)) continue;
    if (ach.check(slug, score)) {
      unlocked.add(ach.id);
      newly.push(ach.id);
    }
  }

  if (newly.length > 0) {
    writePlatformUnlocked([...unlocked]);
  }

  return newly;
}
