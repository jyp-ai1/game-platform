/**
 * Network send scheduler — Render/sim tick ≠ Broadcast frequency.
 *
 * Coalesces pending payloads per key; only the latest survives each interval.
 * Discrete events use sendNow() and bypass the queue.
 *
 * Does not touch DB persistence (transport send() remains Broadcast-only).
 */
import { send as transportSend } from "./room-client";

export type NetworkScheduleFn = (
  roomCode: string,
  event: string,
  payload: unknown
) => ReturnType<typeof transportSend>;

export type NetworkSchedulerStats = {
  scheduled: number;
  coalesced: number;
  flushed: number;
  immediate: number;
  lastPayloadBytes: number;
  lastFlushAt: number;
};

export type NetworkScheduler = {
  /** Queue latest payload for coalesceKey; flushed on interval. */
  schedule: (
    roomCode: string,
    event: string,
    payload: unknown,
    coalesceKey?: string
  ) => void;
  /** Discrete / latency-sensitive event — send immediately. */
  sendNow: NetworkScheduleFn;
  /** Force flush pending queue now. */
  flush: () => void;
  /** Stop interval and drop pending (call on leave/unmount). */
  stop: () => void;
  /** Interval ms used by this scheduler. */
  intervalMs: number;
  getStats: () => NetworkSchedulerStats;
};

type Pending = { roomCode: string; event: string; payload: unknown };

function debugEnabled(): boolean {
  if (typeof process === "undefined") return false;
  const v = process.env.NEXT_PUBLIC_MULTIPLAYER_NETWORK_DEBUG ?? process.env.MULTIPLAYER_NETWORK_DEBUG;
  return v === "1" || v === "true";
}

function payloadBytes(payload: unknown): number {
  try {
    return JSON.stringify(payload)?.length ?? 0;
  } catch {
    return 0;
  }
}

export function createNetworkScheduler(opts: {
  intervalMs: number;
  /** Defaults to multiplayer transport send. */
  sendFn?: NetworkScheduleFn;
  label?: string;
}): NetworkScheduler {
  const intervalMs = Math.max(16, Math.round(opts.intervalMs));
  const sendFn = opts.sendFn ?? transportSend;
  const label = opts.label ?? "net";
  const pending = new Map<string, Pending>();
  let timer: ReturnType<typeof setInterval> | null = null;
  const stats: NetworkSchedulerStats = {
    scheduled: 0,
    coalesced: 0,
    flushed: 0,
    immediate: 0,
    lastPayloadBytes: 0,
    lastFlushAt: 0,
  };

  function log(msg: string, extra?: Record<string, unknown>): void {
    if (!debugEnabled()) return;
    console.info(`[net-sched:${label}] ${msg}`, extra ?? "");
  }

  function flush(): void {
    if (pending.size === 0) return;
    const batch = [...pending.values()];
    pending.clear();
    for (const item of batch) {
      sendFn(item.roomCode, item.event, item.payload);
      stats.flushed += 1;
      stats.lastPayloadBytes = payloadBytes(item.payload);
    }
    stats.lastFlushAt = Date.now();
    log("flush", { count: batch.length, bytes: stats.lastPayloadBytes });
  }

  function ensureTimer(): void {
    if (timer != null) return;
    timer = setInterval(flush, intervalMs);
  }

  function schedule(
    roomCode: string,
    event: string,
    payload: unknown,
    coalesceKey = event
  ): void {
    ensureTimer();
    if (pending.has(coalesceKey)) stats.coalesced += 1;
    stats.scheduled += 1;
    pending.set(coalesceKey, { roomCode, event, payload });
  }

  function sendNow(
    roomCode: string,
    event: string,
    payload: unknown
  ): ReturnType<typeof transportSend> {
    stats.immediate += 1;
    stats.lastPayloadBytes = payloadBytes(payload);
    log("immediate", { event, bytes: stats.lastPayloadBytes });
    return sendFn(roomCode, event, payload);
  }

  function stop(): void {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
    pending.clear();
    log("stop");
  }

  return {
    schedule,
    sendNow,
    flush,
    stop,
    intervalMs,
    getStats: () => ({ ...stats }),
  };
}

/**
 * Default network interval from physics tick — preserves existing balance.networkTickMs formula.
 * networkTickMs = max(80, round(baseTick * 0.9)); here we accept an explicit physics ms.
 */
export function networkIntervalFromPhysicsMs(physicsTickMs: number): number {
  return Math.max(80, Math.round(physicsTickMs * 0.9));
}
