import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceMissionAfterAttack,
  createMissionState,
  missionObjective,
  showExpandUi,
} from "../re-front-missions";

test("first-session copy states the action and the win condition in one glance", () => {
  const start = missionObjective(createMissionState());
  assert.match(start.nextAction, /EXPAND/);
  assert.match(start.detail, /70%/);
  assert.doesNotMatch(start.stepLabel, /STEP 1/);
  assert.doesNotMatch(start.nextAction, /노란 땅을 확장하세요/);
});

test("EXPAND stays available in every live phase", () => {
  for (const phase of ["expand", "grow", "attack-prompt", "attack", "counter", "free"] as const) {
    assert.equal(showExpandUi(phase), true, phase);
  }
});

test("first combat opens free play instead of locking on ATTACK", () => {
  const after = advanceMissionAfterAttack({ ...createMissionState(), phase: "attack-prompt" });
  assert.equal(after.phase, "free");
});
