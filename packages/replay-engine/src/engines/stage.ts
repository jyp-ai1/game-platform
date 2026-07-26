import { Replay } from "@game-platform/replay-sdk";

export const Stage = {
  save: Replay.stage,
  load: Replay.loadStage,
  logic: Replay.logic.stage,
};
