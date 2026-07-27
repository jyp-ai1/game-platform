/** Memory stage ladder — per-game difficulty (not shared). */
export interface MemoryStageDef {
  stageIndex: number;
  cols: number;
  rows: number;
  pairs: number;
  label: string;
}

export const MEMORY_STAGES: MemoryStageDef[] = [
  { stageIndex: 1, cols: 4, rows: 4, pairs: 8, label: "4×4" },
  { stageIndex: 2, cols: 4, rows: 5, pairs: 10, label: "4×5" },
  { stageIndex: 3, cols: 5, rows: 6, pairs: 15, label: "5×6" },
  { stageIndex: 4, cols: 6, rows: 6, pairs: 18, label: "6×6" },
];

export function getMemoryStage(stageIndex: number): MemoryStageDef {
  return MEMORY_STAGES[Math.min(stageIndex - 1, MEMORY_STAGES.length - 1)]!;
}

export const FINAL_MEMORY_STAGE = MEMORY_STAGES.length;
