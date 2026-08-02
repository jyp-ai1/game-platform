/** Bubble Shooter — per-stage shot budget and row pressure. */
export interface BubbleShooterStageDef {
  stageIndex: number;
  maxShots: number;
  initialRows: number;
  label: string;
}

export const BUBBLE_SHOOTER_STAGES: BubbleShooterStageDef[] = [
  { stageIndex: 1, maxShots: 40, initialRows: 4, label: "Warm Up" },
  { stageIndex: 2, maxShots: 35, initialRows: 5, label: "Rising" },
  { stageIndex: 3, maxShots: 30, initialRows: 6, label: "Clear All" },
];

export function getBubbleShooterStage(stageIndex: number): BubbleShooterStageDef {
  return BUBBLE_SHOOTER_STAGES[Math.min(stageIndex - 1, BUBBLE_SHOOTER_STAGES.length - 1)]!;
}

export const FINAL_BUBBLE_SHOOTER_STAGE = BUBBLE_SHOOTER_STAGES.length;
