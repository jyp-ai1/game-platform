/** Single Snake Stage ladder — gems · speed · AI per stage (Sprint 13.5). */
import type { MatchRuleConfig } from "./snake-match-rules";

export interface SnakeStageConfig {
  index: number;
  label: string;
  /** Food/gem spawn density multiplier (1.0 = baseline). */
  gemDensityMult: number;
  /** Snake movement speed multiplier. */
  speedMult: number;
  /** Number of AI opponents (0 = solo). */
  aiCount: number;
  /** Points required to clear this stage. */
  scoreTarget: number;
}

export const SNAKE_STAGE_LADDER: SnakeStageConfig[] = [
  { index: 1, label: "Stage 1", gemDensityMult: 1.0, speedMult: 1.0, aiCount: 0, scoreTarget: 80 },
  { index: 2, label: "Stage 2", gemDensityMult: 1.2, speedMult: 1.05, aiCount: 0, scoreTarget: 120 },
  { index: 3, label: "Stage 3", gemDensityMult: 1.4, speedMult: 1.08, aiCount: 1, scoreTarget: 150 },
  { index: 4, label: "Stage 4", gemDensityMult: 1.6, speedMult: 1.12, aiCount: 2, scoreTarget: 180 },
  { index: 5, label: "Stage 5", gemDensityMult: 1.8, speedMult: 1.15, aiCount: 3, scoreTarget: 220 },
];

export const SNAKE_STAGE_COUNT = SNAKE_STAGE_LADDER.length;

export function getSnakeStage(stageIndex: number): SnakeStageConfig {
  const idx = Math.max(0, Math.min(stageIndex, SNAKE_STAGE_LADDER.length - 1));
  return SNAKE_STAGE_LADDER[idx]!;
}

export function buildStageMatchRule(stage: SnakeStageConfig): MatchRuleConfig {
  return {
    rule: "duel",
    label: stage.label,
    description: `${stage.label} · ${stage.scoreTarget}pts`,
    bossEnabled: false,
    eventsEnabled: stage.aiCount >= 2,
    collapseEnabled: false,
    safeZoneDrift: false,
    respawnEnabled: stage.aiCount > 0,
    foodDensityMult: stage.gemDensityMult,
    boostCostMult: 0.55,
    startingSegments: 5,
    cameraZoomMult: 1.22,
    safeZoneRadiusMult: 0,
    scoreTarget: stage.scoreTarget,
  };
}

/** Population = 1 human + stage AI count. */
export function stagePopulation(stage: SnakeStageConfig): number {
  return 1 + stage.aiCount;
}
