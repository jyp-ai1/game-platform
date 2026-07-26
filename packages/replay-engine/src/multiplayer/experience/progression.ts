/** Universal Progression — stage themes per game */
import type { ProgressionStage } from "@game-platform/shared";

export const SNAKE_STAGES: ProgressionStage[] = [
  { id: 1, name: "초원", theme: "meadow", minScore: 0 },
  { id: 2, name: "동굴", theme: "cave", minScore: 150 },
  { id: 3, name: "빙하", theme: "ice", minScore: 400 },
  { id: 4, name: "우주", theme: "space", minScore: 800 },
];

export function getStageForScore(stages: ProgressionStage[], score: number): ProgressionStage {
  let current = stages[0]!;
  for (const s of stages) {
    if (score >= s.minScore) current = s;
  }
  return current;
}

export const ProgressionEngine = {
  snake: SNAKE_STAGES,
  stageFor: getStageForScore,
};
