/**
 * FIX-DEATH-001 — Execution Order (final instrumentation).
 * Observe only: collision / steering / escape / turn / killSnake order within one host frame.
 *
 * Note: tickBotBrains runs BEFORE tickWorld increments world.tick.
 * We group by host frame (not world.tick) so brain + physics are comparable.
 *
 * Enable: ?debug=1
 * Read: window.__EXEC_ORDER__
 */
export type ExecPhase =
  | "tick_begin"
  | "escape"
  | "turn"
  | "steering"
  | "collision"
  | "killSnake"
  | "tick_end";

export interface ExecOrderEvent {
  t: number;
  seq: number;
  frame: number;
  worldTick: number;
  phase: ExecPhase;
  actorId?: string;
  detail?: Record<string, unknown>;
}

const MAX = 400;
const TRACKED: ExecPhase[] = ["escape", "turn", "steering", "collision", "killSnake"];

type Store = {
  rc: "EXEC-ORDER";
  enabled: boolean;
  seq: number;
  frame: number;
  events: ExecOrderEvent[];
  byFrame: Record<string, ExecPhase[]>;
};

let store: Store = empty();

function empty(): Store {
  return {
    rc: "EXEC-ORDER",
    enabled: false,
    seq: 0,
    frame: 0,
    events: [],
    byFrame: {},
  };
}

function enabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("debug") === "1";
  } catch {
    return false;
  }
}

export function initExecOrderTrace(): void {
  store = empty();
  store.enabled = enabled();
  publish();
  if (store.enabled) console.info("[EXEC-ORDER] probe ON — window.__EXEC_ORDER__");
}

function publish(): void {
  if (typeof window === "undefined") return;
  store.enabled = store.enabled || enabled();
  (
    window as Window & {
      __EXEC_ORDER__?: Store & { summary?: () => ReturnType<typeof execOrderSummary> };
    }
  ).__EXEC_ORDER__ = Object.assign(store, { summary: execOrderSummary });
}

export function execOrderSummary(): {
  enabled: boolean;
  eventCount: number;
  sampleFrames: number;
  dominantOrder: string | null;
  orderCounts: Record<string, number>;
  table: { phase: ExecPhase; ran: boolean; firstRank: number | null }[];
  proof: string;
  exampleFrame: number | null;
  exampleOrder: ExecPhase[];
} {
  const counts: Record<string, number> = {};
  let best: { frame: number; order: ExecPhase[]; n: number } | null = null;
  for (const [frame, order] of Object.entries(store.byFrame)) {
    const key = order.join(" → ");
    counts[key] = (counts[key] ?? 0) + 1;
    if (!best || counts[key] > best.n) {
      best = { frame: Number(frame), order, n: counts[key] };
    }
  }
  const dominant =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const firstRanks: Partial<Record<ExecPhase, number[]>> = {};
  for (const order of Object.values(store.byFrame)) {
    order.forEach((p, i) => {
      if (!firstRanks[p]) firstRanks[p] = [];
      firstRanks[p]!.push(i + 1);
    });
  }
  const table = TRACKED.map((phase) => {
    const ranks = firstRanks[phase] ?? [];
    const ran = ranks.length > 0;
    const firstRank = ran
      ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length)
      : null;
    return { phase, ran, firstRank };
  });
  table.sort((a, b) => {
    if (a.firstRank == null && b.firstRank == null) return 0;
    if (a.firstRank == null) return 1;
    if (b.firstRank == null) return -1;
    return a.firstRank - b.firstRank;
  });

  return {
    enabled: store.enabled,
    eventCount: store.events.length,
    sampleFrames: Object.keys(store.byFrame).length,
    dominantOrder: dominant,
    orderCounts: counts,
    table,
    proof: dominant
      ? `dominant: ${dominant} (${counts[dominant]} frames)`
      : "no ordered frames yet",
    exampleFrame: best?.frame ?? null,
    exampleOrder: best?.order ?? [],
  };
}

/** Call once at start of host simulation loop (before tickBotBrains). */
export function beginExecOrderFrame(worldTick: number): number {
  if (typeof window === "undefined") return store.frame;
  if (!store.enabled && !enabled()) return store.frame;
  store.enabled = true;
  store.frame += 1;
  noteExecOrder("tick_begin", worldTick);
  return store.frame;
}

export function noteExecOrder(
  phase: ExecPhase,
  worldTick: number,
  actorId?: string,
  detail?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  if (!store.enabled && !enabled()) return;
  store.enabled = true;
  if (store.frame <= 0) store.frame = 1;

  store.seq += 1;
  const frame = store.frame;
  store.events.push({
    t: Date.now(),
    seq: store.seq,
    frame,
    worldTick,
    phase,
    actorId,
    detail,
  });
  if (store.events.length > MAX) store.events.splice(0, store.events.length - MAX);

  if (TRACKED.includes(phase)) {
    const key = String(frame);
    if (!store.byFrame[key]) store.byFrame[key] = [];
    const arr = store.byFrame[key]!;
    if (!arr.includes(phase)) arr.push(phase);
  }

  publish();

  if (
    typeof console !== "undefined" &&
    (phase === "tick_begin" || phase === "killSnake" || store.seq % 20 === 0)
  ) {
    console.info(
      `[EXEC-ORDER] #${store.seq} frame=${frame} wt=${worldTick} ${phase}${actorId ? ` ${actorId}` : ""}`
    );
  }
}
