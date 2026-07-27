/** 2048 tile milestones — per-game stage ladder. */
export const TILE_STAGES = [128, 256, 512, 1024, 2048] as const;

export type TileStage = (typeof TILE_STAGES)[number];

export function tileStageIndex(value: number): number {
  let idx = 0;
  for (let i = 0; i < TILE_STAGES.length; i++) {
    if (value >= TILE_STAGES[i]!) {
      idx = i + 1;
    }
  }
  return idx;
}

export function tileStageLabel(value: number): string {
  const stage = TILE_STAGES.find((t) => value >= t);
  return stage ? String(stage) : "—";
}
