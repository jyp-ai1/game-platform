import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  };
});

describe("FriendsEngine", () => {
  it("records co-play and computes frequent relation", async () => {
    const { recordCoPlay, getFriends } = await import("../friends");
    for (let i = 0; i < 10; i++) {
      recordCoPlay("friend-1", "민수", "snake", i % 2 === 0 ? "win" : "loss");
    }
    const friends = getFriends();
    assert.equal(friends.length, 1);
    assert.equal(friends[0]!.nickname, "민수");
    assert.equal(friends[0]!.coPlayCount, 10);
    assert.equal(friends[0]!.relation, "frequent");
  });

  it("marks new friends correctly", async () => {
    const { recordCoPlay, getFriends } = await import("../friends");
    recordCoPlay("friend-2", "지수", "snake");
    assert.equal(getFriends()[0]!.passport.level, 1);
  });
});

describe("RecommendEngine", () => {
  it("prioritizes join_friend over quick_match", async () => {
    const { getSituations } = await import("../recommend");
    const recs = getSituations({
      presence: [{
        deviceId: "p1",
        nickname: "철수",
        status: "playing",
        gameSlug: "snake",
        roomCode: "ABC123",
        since: new Date().toISOString(),
        spectatable: true,
      }],
    });
    assert.ok(recs.length > 0);
    assert.equal(recs[0]!.kind, "join_friend");
  });

  it("surfaces play mode actions for snake", async () => {
    const { playModeActions } = await import("../recommend");
    const actions = playModeActions("snake");
    assert.ok(actions.some((a) => a.label === "혼자 하기"));
    assert.ok(actions.some((a) => a.label === "친구와 하기"));
  });
});

describe("PartyEngine", () => {
  it("creates party with leader ready", async () => {
    store.set("play29:device-id", "device-leader");
    const { createParty } = await import("../party");
    const party = await createParty("Leader");
    assert.equal(party.members.length, 1);
    assert.equal(party.leaderId, "device-leader");
    assert.equal(party.members[0]!.ready, true);
  });
});
