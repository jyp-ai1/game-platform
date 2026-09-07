import assert from "node:assert/strict";
import test from "node:test";

import { createMissionState, missionObjective } from "../re-front-missions";

test("first-session copy states the action and the win condition in one glance", () => {
  const start = missionObjective(createMissionState());
  assert.match(start.nextAction, /EXPAND/);
  assert.match(start.detail, /70%/);
  assert.doesNotMatch(start.stepLabel, /STEP 1/);
  assert.doesNotMatch(start.nextAction, /노란 땅을 확장하세요/);
});
