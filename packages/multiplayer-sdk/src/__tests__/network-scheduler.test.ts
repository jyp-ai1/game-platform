/**
 * Network scheduler unit tests — coalesce + stop + frequency cap.
 * Run: npx tsx --test packages/multiplayer-sdk/src/__tests__/network-scheduler.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createNetworkScheduler,
  networkIntervalFromPhysicsMs,
} from "../client/network-scheduler";

describe("network scheduler", () => {
  it("networkIntervalFromPhysicsMs matches balance formula floor", () => {
    assert.equal(networkIntervalFromPhysicsMs(120), 108);
    assert.equal(networkIntervalFromPhysicsMs(33), 80);
    assert.equal(networkIntervalFromPhysicsMs(50), 80);
  });

  it("coalesces to latest payload per key within interval", async () => {
    const sent: Array<{ event: string; payload: unknown }> = [];
    const sched = createNetworkScheduler({
      intervalMs: 40,
      label: "test",
      sendFn: (_code, event, payload) => {
        sent.push({ event, payload });
        return null;
      },
    });

    sched.schedule("ROOM", "state", { tick: 1 }, "state");
    sched.schedule("ROOM", "state", { tick: 2 }, "state");
    sched.schedule("ROOM", "state", { tick: 3 }, "state");
    assert.equal(sent.length, 0);

    await new Promise((r) => setTimeout(r, 55));
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0]!.payload, { tick: 3 });
    assert.ok(sched.getStats().coalesced >= 2);

    sched.stop();
  });

  it("sendNow bypasses coalesce queue", () => {
    const sent: string[] = [];
    const sched = createNetworkScheduler({
      intervalMs: 10_000,
      sendFn: (_c, event) => {
        sent.push(event);
        return null;
      },
    });
    sched.schedule("R", "state", { t: 1 }, "state");
    sched.sendNow("R", "input:x", { dx: 1 });
    assert.deepEqual(sent, ["input:x"]);
    sched.stop();
  });

  it("stop prevents further flushes (no ghost broadcast)", async () => {
    const sent: unknown[] = [];
    const sched = createNetworkScheduler({
      intervalMs: 30,
      sendFn: (_c, _e, payload) => {
        sent.push(payload);
        return null;
      },
    });
    sched.schedule("R", "state", { t: 1 }, "state");
    sched.stop();
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(sent.length, 0);
  });

  it("flush rate does not exceed scheduler frequency under fast schedule spam", async () => {
    const sent: number[] = [];
    const sched = createNetworkScheduler({
      intervalMs: 50,
      sendFn: (_c, _e, payload) => {
        sent.push((payload as { n: number }).n);
        return null;
      },
    });
    const spam = setInterval(() => {
      sched.schedule("R", "state", { n: Date.now() }, "state");
    }, 5);
    await new Promise((r) => setTimeout(r, 220));
    clearInterval(spam);
    sched.stop();
    // ~220ms / 50ms ≈ 4 flushes (+/-1); must not approach spam rate (~40)
    assert.ok(sent.length <= 6, `expected <=6 flushes, got ${sent.length}`);
    assert.ok(sent.length >= 2, `expected >=2 flushes, got ${sent.length}`);
  });
});
