/**
 * Universal Runtime 2.0 — shared config for all 50 games.
 * Project Phoenix Epic1/Epic2.
 */
import { PLAYABLE_SLUGS } from "@/lib/playable-games";
import { getStagesForGame } from "@/lib/game-stages";

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
  boss: BossConfig;
  xpMultiplier: number;
  coinMultiplier: number;
  comboEnabled: boolean;
  missionEnabled: boolean;
}

const DEFAULT_TUTORIAL = "Clear stages, beat the boss, earn XP and coins. Sessions run 5–30 minutes.";

const GAME_CONFIG: Record<string, Partial<RuntimeGameConfig>> = {
  snake: { tutorialHint: "Arrow keys to move. Reach Stage 2 at 1200 pts.", difficulty: "normal" },
  "2048": { tutorialHint: "Merge tiles to 2048 and beyond.", difficulty: "normal" },
  memory: { tutorialHint: "Match pairs — grid grows each stage.", difficulty: "easy" },
  "tic-tac-toe": { tutorialHint: "Win rounds to advance stages.", difficulty: "easy" },
  connect4: { tutorialHint: "Connect four — multiplayer ready.", difficulty: "normal" },
  tetris: { tutorialHint: "Survive increasing speed. Boss at 10K.", difficulty: "hard" },
  "air-hockey": { tutorialHint: "Fast reflexes — invite a friend.", difficulty: "normal" },
  "tank-battle": { tutorialHint: "Destroy waves — co-op room supported.", difficulty: "hard" },
};

const BOSS_NAMES = ["Guardian", "Champion", "Overlord", "Master", "Legend"];

function autoBoss(slug: string): BossConfig {
  const stages = getStagesForGame(slug);
  const threshold = stages[stages.length - 1]?.target ?? 2000;
  const idx = PLAYABLE_SLUGS.indexOf(slug as (typeof PLAYABLE_SLUGS)[number]);
  const name = BOSS_NAMES[(idx >= 0 ? idx : slug.length) % BOSS_NAMES.length];
  return {
    name: `${name} of ${slug.replace(/-/g, " ")}`,
    threshold,
    rewardCoins: 15 + (idx >= 0 ? idx % 10 : 5),
  };
}

export function getRuntimeConfig(slug: string): RuntimeGameConfig {
  const override = GAME_CONFIG[slug] ?? {};
  const idx = PLAYABLE_SLUGS.indexOf(slug as (typeof PLAYABLE_SLUGS)[number]);
  const difficulty =
    override.difficulty ??
    (idx % 5 === 0 ? "easy" : idx % 3 === 0 ? "hard" : "normal");

  return {
    slug,
    tutorialHint: override.tutorialHint ?? DEFAULT_TUTORIAL,
    difficulty,
    boss: autoBoss(slug),
    xpMultiplier: override.xpMultiplier ?? 1,
    coinMultiplier: override.coinMultiplier ?? 1,
    comboEnabled: true,
    missionEnabled: true,
  };
}

export function isBossDefeated(slug: string, score: number): boolean {
  return score >= getRuntimeConfig(slug).boss.threshold;
}

export function getDifficultyLabel(slug: string): string {
  const d = getRuntimeConfig(slug).difficulty;
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export function getAllRuntimeConfigs(): RuntimeGameConfig[] {
  return PLAYABLE_SLUGS.map((slug) => getRuntimeConfig(slug));
}
