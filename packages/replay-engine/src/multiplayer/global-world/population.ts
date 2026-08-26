/** Population Fill Engine — 20 humans + 30 bots max */
export const HUMAN_MAX = 20;
export const BOT_MAX = 30;
export const POPULATION_TARGET = HUMAN_MAX + BOT_MAX;

export type BotDifficulty = "easy" | "normal" | "hunter" | "legend";

export function pickBotDifficulty(humanCount: number): BotDifficulty {
  // Closed Alpha default floor: Normal (Easy reserved for sparse rooms only via override)
  if (humanCount < 15) return "normal";
  if (humanCount < 35) return "hunter";
  return "legend";
}

export function botsNeeded(humanCount: number, target = POPULATION_TARGET): number {
  return Math.max(0, target - humanCount);
}

export interface PopulationSnapshot {
  total: number;
  humans: number;
  bots: number;
  target: number;
}

export function snapshotPopulation(counts: { humans: number; bots: number }, target = POPULATION_TARGET): PopulationSnapshot {
  return {
    total: counts.humans + counts.bots,
    humans: counts.humans,
    bots: counts.bots,
    target,
  };
}

/** AI Director — population-aware world tuning signals */
export interface PopulationDirectorInput {
  humanCount: number;
  botCount: number;
  avgKillsPerMinute: number;
  foodRatio: number;
}

export interface PopulationDirectorOutput {
  botTarget: number;
  foodBoostPercent: number;
  spawnGoldenSnake: boolean;
}

export function runPopulationDirector(input: PopulationDirectorInput, target = POPULATION_TARGET): PopulationDirectorOutput {
  const botTarget = botsNeeded(input.humanCount, target);
  let foodBoostPercent = 0;
  if (input.avgKillsPerMinute < 2 && input.humanCount + input.botCount >= 8) {
    foodBoostPercent = 25;
  }
  if (input.foodRatio < 0.35) foodBoostPercent = Math.max(foodBoostPercent, 35);

  const spawnGoldenSnake =
    input.humanCount >= 3 &&
    input.avgKillsPerMinute < 3 &&
    input.foodRatio < 0.5;

  return { botTarget, foodBoostPercent, spawnGoldenSnake };
}

export const PopulationEngine = {
  target: POPULATION_TARGET,
  pickDifficulty: pickBotDifficulty,
  botsNeeded,
  snapshot: snapshotPopulation,
  director: runPopulationDirector,
};
