import assert from "node:assert/strict";
import test from "node:test";

import {
  applyRfSyncState,
  createRfWorld,
  nationCenter,
  reconcileHumans,
  serializeRfState,
} from "../re-front-engine";
import { humanViewTarget, humansVisibleInView } from "../rf-human-view";

const VIEW = { w: 1200, h: 420, zoom: 1.15 };

test("Guest local spawn is not Host snapshot spawn — camera must refit", () => {
  const hostWorld = createRfWorld("host-id", "RFHost", [{ id: "host-id", nickname: "RFHost" }]);
  reconcileHumans(hostWorld, [
    { id: "host-id", nickname: "RFHost" },
    { id: "guest-id", nickname: "RFGuest" },
  ]);

  const guestLocal = createRfWorld("guest-id", "RFGuest", [
    { id: "host-id", nickname: "RFHost" },
    { id: "guest-id", nickname: "RFGuest" },
  ]);
  const localSpawn = nationCenter(guestLocal, "guest-id");
  assert.ok(localSpawn);

  applyRfSyncState(guestLocal, serializeRfState(hostWorld));
  const synced = nationCenter(guestLocal, "guest-id");
  const host = nationCenter(guestLocal, "host-id");
  assert.ok(synced && host);

  const moved =
    Math.abs(localSpawn!.cx - synced!.cx) + Math.abs(localSpawn!.cy - synced!.cy);
  assert.ok(moved >= 20, `expected Guest cells to relocate after snapshot, moved=${moved}`);

  const staleCam = { x: localSpawn!.cx, y: localSpawn!.cy };
  assert.equal(humansVisibleInView(guestLocal, staleCam, VIEW.w, VIEW.h, VIEW.zoom), false);

  const target = humanViewTarget(guestLocal, "guest-id");
  assert.ok(target);
  assert.equal(
    humansVisibleInView(guestLocal, { x: target!.cx, y: target!.cy }, VIEW.w, VIEW.h, VIEW.zoom),
    true
  );
});

test("Host snapshot replaces leftover Guest-local nations", () => {
  const hostWorld = createRfWorld("host-id", "RFHost", [{ id: "host-id", nickname: "RFHost" }]);
  reconcileHumans(hostWorld, [
    { id: "host-id", nickname: "RFHost" },
    { id: "guest-id", nickname: "RFGuest" },
  ]);
  const guestLocal = createRfWorld("guest-id", "RFGuest", [
    { id: "host-id", nickname: "RFHost" },
    { id: "guest-id", nickname: "RFGuest" },
  ]);
  const beforeIds = Object.keys(guestLocal.nations).sort();
  applyRfSyncState(guestLocal, serializeRfState(hostWorld));
  const afterIds = Object.keys(guestLocal.nations).sort();
  assert.deepEqual(afterIds, Object.keys(hostWorld.nations).sort());
  assert.notDeepEqual(beforeIds, afterIds);
});
