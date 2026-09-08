import assert from "node:assert/strict";
import test from "node:test";

import type { GameRoom } from "@game-platform/shared";

import {
  decideBomberGuestTimeout,
  decideBomberJoinFailed,
  isGhostBomberHost,
  isLiveBomberHost,
  noteBomberHostState,
} from "../bomber-shard-lifecycle";
import type { BomberSyncState } from "../bomber-engine";

function room(partial: Partial<GameRoom> & Pick<GameRoom, "hostId" | "players">): GameRoom {
  return {
    code: "BOMBER-A",
    gameSlug: "bomber",
    maxPlayers: 8,
    spectators: [],
    status: "waiting",
    countdown: 0,
    matchMode: "public",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

function state(partial: Partial<BomberSyncState> = {}): BomberSyncState {
  return {
    tick: 1,
    mapId: 0,
    playerSlots: 4,
    cols: 15,
    rows: 13,
    grid: [],
    players: [{ id: "host-1", isBot: false, alive: true }],
    bombs: [],
    blasts: [],
    rankings: [],
    matchStartedAt: Date.now(),
    matchOver: false,
    ...partial,
  } as BomberSyncState;
}

test("ONLINE-005: listed host + no sim state is not live", () => {
  const ghostRoster = room({
    hostId: "host-1",
    players: [{ deviceId: "host-1", nickname: "Gone", ready: true }],
  });
  assert.equal(isLiveBomberHost(ghostRoster), false);
  assert.equal(isGhostBomberHost(ghostRoster), false);
  assert.equal(decideBomberJoinFailed(ghostRoster), "reclaim");
});

test("ONLINE-005: missing room join-fail reclaims as MP host", () => {
  assert.equal(decideBomberJoinFailed(null), "reclaim");
});

test("ONLINE-005: live host join-fail stays Connection failed", () => {
  const live = room({
    hostId: "host-1",
    players: [{ deviceId: "host-1", nickname: "Host", ready: true }],
    gameState: {
      state: state(),
      _lastEvent: "state",
      _updatedAt: new Date().toISOString(),
    },
  });
  assert.equal(isLiveBomberHost(live), true);
  assert.equal(decideBomberJoinFailed(live), "fail");
});

test("ONLINE-005: guest ack timeout with no host broadcast reclaims", () => {
  assert.equal(decideBomberGuestTimeout({ acked: false, sawHostState: false }), "reclaim");
});

test("ONLINE-005: live host broadcast without seat is Connection failed", () => {
  assert.equal(decideBomberGuestTimeout({ acked: false, sawHostState: true }), "fail");
});

test("ONLINE-005: noteBomberHostState requires matching live map", () => {
  assert.equal(noteBomberHostState(state({ mapId: 0 }), 0), true);
  assert.equal(noteBomberHostState(state({ mapId: 1 }), 0), false);
  assert.equal(noteBomberHostState(state({ matchOver: true }), 0), false);
  assert.equal(noteBomberHostState(undefined, 0), false);
});
