/** Bubble Pop stage ladder — per-game difficulty (not shared). */
export interface BubbleStageDef {
  stageIndex: number;
  initialRows: number;
  shotsPerCeilingDrop: number;
  colorCount: number;
  flyingSpeed: number;
  label: string;
}

export const BUBBLE_STAGES: BubbleStageDef[] = [
  { stageIndex: 1, initialRows: 4, shotsPerCeilingDrop: 8, colorCount: 4, flyingSpeed: 260, label: "Warm Up" },
  { stageIndex: 2, initialRows: 5, shotsPerCeilingDrop: 7, colorCount: 5, flyingSpeed: 300, label: "Rising" },
  { stageIndex: 3, initialRows: 6, shotsPerCeilingDrop: 6, colorCount: 5, flyingSpeed: 340, label: "Clear All" },
];

export function getBubbleStage(stageIndex: number): BubbleStageDef {
  return BUBBLE_STAGES[Math.min(stageIndex - 1, BUBBLE_STAGES.length - 1)]!;
}

export const FINAL_BUBBLE_STAGE = BUBBLE_STAGES.length;
