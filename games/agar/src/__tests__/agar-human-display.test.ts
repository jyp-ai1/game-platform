import assert from "node:assert/strict";
import test from "node:test";

import { AGAR_START_MASS, massToRadius } from "../agar-io-engine";
import {
  AGAR_BOT_NICK_MIN_RADIUS,
  agarCellNickname,
  agarHumanHudNicknames,
  agarHumanLabelAboveCell,
  shouldShowAgarCellNickname,
} from "../agar-human-display";

test("human nickname shows at start-cell radius (below bot threshold)", () => {
  const r = massToRadius(AGAR_START_MASS);
  assert.ok(r <= AGAR_BOT_NICK_MIN_RADIUS);
  assert.equal(shouldShowAgarCellNickname(false, r), true);
  assert.equal(agarHumanLabelAboveCell(false, r), true);
});

test("bot nickname stays hidden at start-cell radius", () => {
  const r = massToRadius(AGAR_START_MASS);
  assert.equal(shouldShowAgarCellNickname(true, r), false);
  assert.equal(agarHumanLabelAboveCell(true, r), false);
});

test("bot nickname still shows only when large", () => {
  assert.equal(shouldShowAgarCellNickname(true, AGAR_BOT_NICK_MIN_RADIUS), false);
  assert.equal(shouldShowAgarCellNickname(true, AGAR_BOT_NICK_MIN_RADIUS + 1), true);
});

test("HUD lists humans only, independent of TOP10", () => {
  const names = agarHumanHudNicknames([
    { isBot: false, nickname: "CPOHostAB12" },
    { isBot: true, nickname: "Cell" },
    { isBot: false, nickname: "CPOGuestAB12" },
  ]);
  assert.deepEqual(names, ["CPOHostAB12", "CPOGuestAB12"]);
  assert.equal(agarCellNickname("CPOGuestAB12"), "CPOGue");
});
