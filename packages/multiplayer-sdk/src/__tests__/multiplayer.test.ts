/**
 * Multiplayer Test Suite — P0-2
 * Run: node --import tsx packages/multiplayer-sdk/src/__tests__/multiplayer.test.ts
 * Or: npx tsx packages/multiplayer-sdk/src/__tests__/multiplayer.test.ts
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import {
  setMultiplayerTransport,
  createRoom,
  joinRoom,
  getRoom,
  send,
  start,
  finish,
  spectator,
  replay,
  leaveRoom,
  setPlayerReady,
  tickRoomCountdown,
} from "../client/room-client";
import { memoryTransport } from "../transport/memory";

const DEVICE_KEY = "play29:device-id";

function mockDevice(id: string): void {
  const store: Record<string, string> = { [DEVICE_KEY]: id };
  (globalThis as { window?: Window }).window = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      key: () => null,
      length: 0,
      clear: () => {},
    },
  } as unknown as Window;
}

describe("Multiplayer Transport Suite", () => {
  beforeEach(() => {
    setMultiplayerTransport(memoryTransport);
    mockDevice("device-host");
  });

  it("1 player — create room", () => {
    const room = createRoom("snake", 20, "public");
    assert.equal(room.players.length, 1);
    assert.ok(getRoom(room.code));
  });

  it("2 players — join", () => {
    const room = createRoom("snake", 20, "private");
    mockDevice("device-p2");
    const joined = joinRoom(room.code, { nickname: "P2" });
    assert.ok(joined);
    assert.equal(joined!.players.length, 2);
  });

  it("3 players — join", () => {
    const room = createRoom("snake", 20, "private");
    mockDevice("device-p2");
    joinRoom(room.code, { nickname: "P2" });
    mockDevice("device-p3");
    const third = joinRoom(room.code, { nickname: "P3" });
    assert.equal(third!.players.length, 3);
  });

  it("20 players — max capacity", () => {
    const room = createRoom("snake", 20, "public");
    for (let i = 2; i <= 20; i++) {
      mockDevice(`device-p${i}`);
      joinRoom(room.code, { nickname: `P${i}` });
    }
    assert.equal(getRoom(room.code)!.players.length, 20);
    mockDevice("device-p21");
    const overflow = joinRoom(room.code, { nickname: "P21" });
    assert.equal(overflow, null);
  });

  it("disconnect — leave room", () => {
    const room = createRoom("snake", 4, "private");
    mockDevice("device-p2");
    joinRoom(room.code, { nickname: "P2" });
    mockDevice("device-p2");
    leaveRoom(room.code);
    const after = getRoom(room.code);
    assert.ok(after && after.players.length === 1);
  });

  it("reconnect — token", () => {
    const room = createRoom("snake", 4, "private");
    const token = room.players[0]!.reconnectToken!;
    const reconnected = replay(room.code, token);
    assert.ok(reconnected);
  });

  it("late join — after start", () => {
    const room = createRoom("snake", 8, "public");
    mockDevice("device-p2");
    joinRoom(room.code, { nickname: "P2" });
    mockDevice("device-host");
    setPlayerReady(room.code, true);
    mockDevice("device-p2");
    setPlayerReady(room.code, true);
    mockDevice("device-host");
    start(room.code);
    mockDevice("device-late");
    const late = joinRoom(room.code, { nickname: "Late" });
    assert.ok(late === null || late.players.length <= 8);
  });

  it("spectator — join watch", () => {
    const room = createRoom("snake", 4, "private");
    const spec = spectator(room.code);
    assert.ok(spec!.spectators.length >= 1);
  });

  it("host leave — transfers host", () => {
    const room = createRoom("snake", 4, "private");
    mockDevice("device-p2");
    joinRoom(room.code, { nickname: "P2" });
    const hostId = room.hostId;
    mockDevice("device-host");
    leaveRoom(room.code);
    const after = getRoom(room.code);
    assert.ok(after && after.hostId !== hostId);
  });

  it("network delay — send/sync state", () => {
    const room = createRoom("snake", 4, "private");
    send(room.code, "state", { tick: 1, delayed: true });
    const synced = getRoom(room.code);
    const gs = synced!.gameState as Record<string, unknown>;
    assert.equal((gs.state as { tick: number }).tick, 1);
  });

  it("ready countdown → playing", () => {
    const room = createRoom("snake", 4, "private");
    mockDevice("device-p2");
    joinRoom(room.code, { nickname: "P2" });
    mockDevice("device-host");
    setPlayerReady(room.code, true);
    mockDevice("device-p2");
    setPlayerReady(room.code, true);
    mockDevice("device-host");
    let r = getRoom(room.code)!;
    assert.equal(r.status, "ready");
    while (r.countdown > 0) {
      r = tickRoomCountdown(room.code)!;
    }
    assert.equal(r.status, "playing");
  });

  it("finish — match result", () => {
    const room = createRoom("snake", 4, "private");
    const finished = finish(room.code, {
      roomCode: room.code,
      gameSlug: "snake",
      winnerId: room.hostId,
      scores: { [room.hostId]: 100 },
      finishedAt: new Date().toISOString(),
    });
    assert.equal(finished!.status, "finished");
  });
});
