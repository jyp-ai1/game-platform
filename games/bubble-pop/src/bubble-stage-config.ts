/** Bubble Pop stage ladder — per-game difficulty (not shared). */
export interface BubbleStageDef {
  stageIndex: number;
  initialRows: number;
  shotsPerCeilingDrop: number;
  colorCount: number;
  label: string;
}

export const BUBBLE_STAGES: BubbleStageDef[] = [
  { stageIndex: 1, initialRows: 4, shotsPerCeilingDrop: 8, colorCount: 4, label: "Bubble 20" },
  { stageIndex: 2, initialRows: 5, shotsPerCeilingDrop: 7, colorCount: 5, label: "Bubble 25" },
  { stageIndex: 3, initialRows: 6, shotsPerCeilingDrop: 6, colorCount: 5, label: "Bubble 30" },
];

export function getBubbleStage(stageIndex: number): BubbleStageDef {
  return BUBBLE_STAGES[Math.min(stageIndex - 1, BUBBLE_STAGES.length - 1)]!;
}

export const FINAL_BUBBLE_STAGE = BUBBLE_STAGES.length;
