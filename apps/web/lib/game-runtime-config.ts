/**
 * Universal Runtime 2.0 — shared config for all 50 games.
 * Project Phoenix Epic1.
 */
export type RuntimePhase =
  | "loading"
  | "ready"
  | "tutorial"
  | "playing"
  | "paused"
  | "result"
  | "reward"
  | "continue";

export interface BossConfig {
  name: string;
  threshold: number;
  rewardCoins: number;
}

export interface RuntimeGameConfig {
  slug: string;
  tutorialHint: string;
  difficulty: "easy" | "normal" | "hard";
  boss?: BossConfig;
  xpMultiplier: number;
  coinMultiplier: number;
}

const DEFAULT_TUTORIAL = "Tap or use keyboard to play. Beat your best score!";

const GAME_CONFIG: Record<string, Partial<RuntimeGameConfig>> = {
  snake: { tutorialHint: "Arrow keys to move. Eat food, avoid walls.", difficulty: "normal", boss: { name: "Serpent King", threshold: 2500, rewardCoins: 20 } },
  "2048": { tutorialHint: "Swipe to merge tiles. Reach 2048!", difficulty: "normal", boss: { name: "Tile Master", threshold: 4096, rewardCoins: 25 } },
  memory: { tutorialHint: "Match pairs. Fewer moves = higher score.", difficulty: "easy" },
  "tic-tac-toe": { tutorialHint: "Get three in a row before your opponent.", difficulty: "easy" },
  connect4: { tutorialHint: "Drop discs. Connect four to win.", difficulty: "normal" },
  tetris: { tutorialHint: "Clear lines. Speed increases over time.", difficulty: "hard", boss: { name: "Block Lord", threshold: 10000, rewardCoins: 30 } },
};

export function getRuntimeConfig(slug: string): RuntimeGameConfig {
  const override = GAME_CONFIG[slug] ?? {};
  return {
    slug,
    tutorialHint: override.tutorialHint ?? DEFAULT_TUTORIAL,
    difficulty: override.difficulty ?? "normal",
    boss: override.boss,
    xpMultiplier: override.xpMultiplier ?? 1,
    coinMultiplier: override.coinMultiplier ?? 1,
  };
}

export function isBossDefeated(slug: string, score: number): boolean {
  const cfg = getRuntimeConfig(slug);
  return cfg.boss ? score >= cfg.boss.threshold : false;
}

export function getDifficultyLabel(slug: string): string {
  const d = getRuntimeConfig(slug).difficulty;
  return d.charAt(0).toUpperCase() + d.slice(1);
}
