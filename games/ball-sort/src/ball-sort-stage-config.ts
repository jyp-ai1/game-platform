/** Ball Sort stage ladder — colors/tubes increase per original. */
export interface BallSortStageDef {
  stageIndex: number;
  colorCount: number;
  tubeCount: number;
  emptyTubes: number;
  label: string;
}

export const BALL_SORT_STAGES: BallSortStageDef[] = [
  { stageIndex: 1, colorCount: 3, tubeCount: 5, emptyTubes: 2, label: "3 Colors" },
  { stageIndex: 2, colorCount: 4, tubeCount: 6, emptyTubes: 2, label: "4 Colors" },
  { stageIndex: 3, colorCount: 5, tubeCount: 7, emptyTubes: 2, label: "5 Colors" },
];

export function getBallSortStage(stageIndex: number): BallSortStageDef {
  return BALL_SORT_STAGES[Math.min(stageIndex - 1, BALL_SORT_STAGES.length - 1)]!;
}

export const FINAL_BALL_SORT_STAGE = BALL_SORT_STAGES.length;
