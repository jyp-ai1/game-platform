/** Color Sort stage ladder — colors/tubes increase per original. */
export interface ColorSortStageDef {
  stageIndex: number;
  colorCount: number;
  tubeCount: number;
  emptyTubes: number;
  label: string;
}

export const COLOR_SORT_STAGES: ColorSortStageDef[] = [
  { stageIndex: 1, colorCount: 3, tubeCount: 5, emptyTubes: 2, label: "3 Colors" },
  { stageIndex: 2, colorCount: 4, tubeCount: 6, emptyTubes: 2, label: "4 Colors" },
  { stageIndex: 3, colorCount: 5, tubeCount: 7, emptyTubes: 2, label: "5 Colors" },
];

export function getColorSortStage(stageIndex: number): ColorSortStageDef {
  return COLOR_SORT_STAGES[Math.min(stageIndex - 1, COLOR_SORT_STAGES.length - 1)]!;
}

export const FINAL_COLOR_SORT_STAGE = COLOR_SORT_STAGES.length;
