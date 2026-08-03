/**
 * RC-DEATH-006 — Respawn loop (observe only).
 * Death → timer → respawn → alive → segments → control-ready.
 * Scope: NOT Retry UI / Leaderboard / Collision.
 *
 * Enable: ?debug=1
 * Read: window.__RC_DEATH_006__
 */
export interface Respawn006Event {
  t: number;
  tick: number;
  phase: "timer_scheduled" | "respawn_execute" | "control_ready";
  victimId: string;
  victimBot: boolean;
  detail?: Record<string, unknown>;
}

export interface RespawnCycle {
  victimId: string;
  victimBot: boolean;
  timerScheduled: boolean;
  respawnExecuted: boolean;
  aliveTrue: boolean;
  segmentsAfter: number;
  corpseCleared: boolean;
  controlReady: boolean | null;
  respawnAt: number | null;
  timerMs: number | null;
}

type Store = {
  rc: "RC-DEATH-006";
  enabled: boolean;
  events: Respawn006Event[];
  cycles: Record<string, RespawnCycle>;
  completedCycles: number;
};

let store: Store = empty();

function empty(): Store {
  return {
    rc: "RC-DEATH-006",
    enabled: false,
    events: [],
    cycles: {},
    completedCycles: 0,
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

export function initDeath006Trace(): void {
  store = empty();
  store.enabled = enabled();
  publish();
  if (store.enabled) console.info("[RC-DEATH-006] respawn probe ON — window.__RC_DEATH_006__");
}

function publish(): void {
  if (typeof window === "undefined") return;
  store.enabled = store.enabled || enabled();
  (
    window as Window & {
      __RC_DEATH_006__?: Store & { summary?: () => ReturnType<typeof death006Summary> };
    }
  ).__RC_DEATH_006__ = Object.assign(store, { summary: death006Summary });
}

function ensureCycle(id: string, victimBot: boolean): RespawnCycle {
  if (!store.cycles[id]) {
    store.cycles[id] = {
      victimId: id,
      victimBot,
      timerScheduled: false,
      respawnExecuted: false,
      aliveTrue: false,
      segmentsAfter: 0,
      corpseCleared: true,
      controlReady: null,
      respawnAt: null,
      timerMs: null,
    };
  }
  return store.cycles[id]!;
}

export function death006Summary(): {
  enabled: boolean;
  eventCount: number;
  completedCycles: number;
  pass: {
    timerStarts: boolean;
    snakeCreated: boolean;
    aliveTrue: boolean;
    controlReady: boolean;
    corpseGone: boolean;
  };
  passScore: string;
  verdict: "PASS" | "FAIL_TIMER" | "FAIL_SPAWN" | "FAIL_ALIVE" | "FAIL_CONTROL" | "FAIL_CORPSE" | "NO_CYCLE";
  proof: string;
  cycles: RespawnCycle[];
} {
  const cycles = Object.values(store.cycles);
  const withTimer = cycles.filter((c) => c.timerScheduled);
  const withSpawn = cycles.filter((c) => c.respawnExecuted && c.segmentsAfter > 0);
  const withAlive = cycles.filter((c) => c.aliveTrue);
  const withControl = cycles.filter((c) => c.controlReady === true || (c.victimBot && c.respawnExecuted));
  const corpseOk = cycles.filter((c) => c.respawnExecuted).every((c) => c.corpseCleared);
  const completed = cycles.filter(
    (c) =>
      c.timerScheduled &&
      c.respawnExecuted &&
      c.aliveTrue &&
      c.segmentsAfter > 0 &&
      c.corpseCleared &&
      (c.victimBot || c.controlReady === true)
  );

  const timerStarts = withTimer.length > 0;
  const snakeCreated = withSpawn.length > 0;
  const aliveTrue = withAlive.length > 0;
  const controlReady = withControl.length > 0;
  const corpseGone = cycles.some((c) => c.respawnExecuted) ? corpseOk : false;

  const score = [timerStarts, snakeCreated, aliveTrue, controlReady, corpseGone].filter(Boolean).length;
  let verdict:
    | "PASS"
    | "FAIL_TIMER"
    | "FAIL_SPAWN"
    | "FAIL_ALIVE"
    | "FAIL_CONTROL"
    | "FAIL_CORPSE"
    | "NO_CYCLE" = "NO_CYCLE";
  if (cycles.length === 0) verdict = "NO_CYCLE";
  else if (score === 5 && completed.length > 0) verdict = "PASS";
  else if (!timerStarts) verdict = "FAIL_TIMER";
  else if (!snakeCreated) verdict = "FAIL_SPAWN";
  else if (!aliveTrue) verdict = "FAIL_ALIVE";
  else if (!controlReady) verdict = "FAIL_CONTROL";
  else if (!corpseGone) verdict = "FAIL_CORPSE";
  else verdict = "PASS";

  return {
    enabled: store.enabled,
    eventCount: store.events.length,
    completedCycles: completed.length,
    pass: { timerStarts, snakeCreated, aliveTrue, controlReady, corpseGone },
    passScore: `${score} / 5`,
    verdict: score === 5 && completed.length > 0 ? "PASS" : verdict,
    proof: `cycles=${cycles.length} completed=${completed.length} timed=${withTimer.length} spawned=${withSpawn.length} alive=${withAlive.length}`,
    cycles: cycles.slice(-20),
  };
}

function pushEvent(
  phase: Respawn006Event["phase"],
  tick: number,
  victimId: string,
  victimBot: boolean,
  detail?: Record<string, unknown>
): void {
  store.events.push({ t: Date.now(), tick, phase, victimId, victimBot, detail });
  if (store.events.length > 200) store.events.splice(0, store.events.length - 200);
  publish();
  if (typeof console !== "undefined") {
    console.info(
      `[RC-DEATH-006] ${phase} ${victimBot ? "bot" : "human"} ${victimId}${detail?.segments != null ? ` segs=${detail.segments}` : ""}`
    );
  }
}

/** After killSnake schedules respawnAt (bots or humanAuto). */
export function noteDeath006Timer(input: {
  tick: number;
  victimId: string;
  victimBot: boolean;
  respawnAt: number | null | undefined;
  humanAuto: boolean;
}): void {
  if (typeof window === "undefined") return;
  if (!store.enabled && !enabled()) return;
  store.enabled = true;
  if (!input.respawnAt) {
    publish();
    return;
  }
  const c = ensureCycle(input.victimId, input.victimBot);
  c.timerScheduled = true;
  c.respawnAt = input.respawnAt;
  c.timerMs = Math.max(0, input.respawnAt - Date.now());
  pushEvent("timer_scheduled", input.tick, input.victimId, input.victimBot, {
    respawnAt: input.respawnAt,
    timerMs: c.timerMs,
    humanAuto: input.humanAuto,
  });
}

/** End of respawnSnake. */
export function noteDeath006Respawn(input: {
  tick: number;
  victimId: string;
  victimBot: boolean;
  alive: boolean;
  segments: number;
  awaitingInput: boolean | undefined;
}): void {
  if (typeof window === "undefined") return;
  if (!store.enabled && !enabled()) return;
  store.enabled = true;
  const c = ensureCycle(input.victimId, input.victimBot);
  c.respawnExecuted = true;
  c.aliveTrue = input.alive;
  c.segmentsAfter = input.segments;
  c.corpseCleared = input.segments > 0; // new body present ⇒ old corpse not lingering as empty dead body
  // For bots, "control" = AI can move (awaitingInput false, alive)
  if (input.victimBot) {
    c.controlReady = input.alive && !input.awaitingInput;
  } else {
    c.controlReady = input.alive && input.awaitingInput === false;
  }
  pushEvent("respawn_execute", input.tick, input.victimId, input.victimBot, {
    alive: input.alive,
    segments: input.segments,
    awaitingInput: input.awaitingInput ?? null,
  });
  if (c.controlReady) {
    pushEvent("control_ready", input.tick, input.victimId, input.victimBot, {
      segments: input.segments,
    });
    store.completedCycles += 1;
  }
  publish();
}
