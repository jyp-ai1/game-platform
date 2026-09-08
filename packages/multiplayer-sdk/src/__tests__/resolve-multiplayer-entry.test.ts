/**
 * resolve-multiplayer-entry — shared MP lifecycle tests
 * Run: npx tsx packages/multiplayer-sdk/src/__tests__/resolve-multiplayer-entry.test.ts
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import {
  DEFAULT_ROOM_BY_SLUG,
  isListedHostPresent,
  joinMultiplayerRoom,
  reclaimStaleMultiplayerRoom,
  resolveDefaultRoomCode,
  resolveMultiplayerEntry,
  resolveRoomCodeFromLocation,
} from "../client/resolve-multiplayer-entry";
import { createRoom, getRoom, joinRoom, setMultiplayerTransport } from "../client/room-client";
import { memoryTransport } from "../transport/memory";

const DEVICE_KEY = "play29:device-id";

function mockWindow(search = "", deviceId = "device-a"): void {
  const store: Record<string, string> = { [DEVICE_KEY]: deviceId };
  (globalThis as { window?: Window }).window = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      key: () => null,
      length: 0,
      clear: () => {},
    },
    location: { search } as Location,
  } as unknown as Window;
}

describe("resolve-multiplayer-entry", () => {
  beforeEach(() => {
    setMultiplayerTransport(memoryTransport);
    mockWindow();
  });

  it("resolveDefaultRoomCode — flagship slugs", () => {
    assert.equal(resolveDefaultRoomCode("snake"), "WORLD");
    assert.equal(resolveDefaultRoomCode("bomber"), "BOMBER-A");
    assert.equal(resolveDefaultRoomCode("re-front"), "RF-LOBBY");
    assert.equal(DEFAULT_ROOM_BY_SLUG.agar, "GL-AGAR");
  });

  it("resolveRoomCodeFromLocation — query param or default", () => {
    mockWindow("?room=BOMBER-B");
    assert.equal(resolveRoomCodeFromLocation("bomber"), "BOMBER-B");
    mockWindow("");
    assert.equal(resolveRoomCodeFromLocation("bomber"), "BOMBER-A");
  });

  it("resolveRoomCodeFromLocation — Agar WORLD remaps off Snake shard", () => {
    mockWindow("?room=WORLD");
    assert.equal(resolveRoomCodeFromLocation("agar"), "GL-AGAR");
    mockWindow("?room=WORLD");
    assert.equal(resolveRoomCodeFromLocation("snake"), "WORLD");
    mockWindow("?room=AGAR-FORENSIC-1");
    assert.equal(resolveRoomCodeFromLocation("agar"), "AGAR-FORENSIC-1");
  });

  it("isListedHostPresent — host in roster", () => {
    const room = createRoom("bomber", 8, "public");
    assert.equal(isListedHostPresent(room), true);
    mockWindow("", "device-guest");
    joinRoom(room.code, { nickname: "Guest" });
    const guestView = getRoom(room.code)!;
    assert.equal(isListedHostPresent(guestView), true);
  });

  it("reclaimStaleMultiplayerRoom — same code, new host", () => {
    const stale = createRoom({
      code: "BOMBER-A",
      gameSlug: "bomber",
      maxPlayers: 8,
      matchMode: "public",
      hostNickname: "Ghost",
    });
    mockWindow("", "device-new-host");
    const reclaimed = reclaimStaleMultiplayerRoom(stale, "NewHost", "bomber");
    assert.equal(reclaimed.code, "BOMBER-A");
    assert.equal(reclaimed.hostId, "device-new-host");
    assert.equal(reclaimed.players.length, 1);
  });

  it("joinMultiplayerRoom — retries until joined", async () => {
    createRoom({
      code: "RF-LOBBY",
      gameSlug: "re-front",
      maxPlayers: 8,
      matchMode: "public",
    });
    mockWindow("", "device-joiner");
    const room = await joinMultiplayerRoom("RF-LOBBY", {
      gameSlug: "re-front",
      nickname: "P1",
      joinRetries: 3,
    });
    assert.ok(room);
    assert.ok(room!.players.some((p) => p.deviceId === "device-joiner"));
  });

  it("resolveMultiplayerEntry — guest reclaims when host ghost", async () => {
    createRoom({
      code: "BOMBER-A",
      gameSlug: "bomber",
      maxPlayers: 8,
      matchMode: "public",
      hostNickname: "Stale",
    });
    const stale = getRoom("BOMBER-A")!;
    stale.gameState = {
      state: { players: [{ id: stale.hostId, isBot: false, alive: true }] },
      _updatedAt: new Date(Date.now() - 60_000).toISOString(),
    };
    mockWindow("", "device-reclaimer");
    const result = await resolveMultiplayerEntry({
      gameSlug: "bomber",
      roomCode: "BOMBER-A",
      nickname: "Reclaimer",
      isGhostHost: (room) => {
        const age = Date.now() - new Date(String(room.gameState?._updatedAt ?? 0)).getTime();
        return age > 4000;
      },
      isLiveHost: () => false,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.role, "host");
      assert.equal(result.reclaimed, true);
    }
  });

  it("resolveMultiplayerEntry — join_failed when room missing and no bootstrap", async () => {
    mockWindow("", "device-lonely");
    const result = await resolveMultiplayerEntry({
      gameSlug: "unknown-game",
      roomCode: "MISSING-ROOM-XYZ",
      nickname: "P",
      joinRetries: 1,
      joinRetryDelayMs: 10,
      allowStaleReclaim: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "join_failed");
    }
  });
});
