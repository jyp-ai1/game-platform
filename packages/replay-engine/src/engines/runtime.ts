import { Replay } from "@game-platform/replay-sdk";

export const Runtime = {
  init: Replay.init,
  score: Replay.score,
  stage: Replay.stage,
  loadStage: Replay.loadStage,
  publish: Replay.publish,
};
