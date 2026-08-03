/**
 * RC-DEATH-002 — Player Death pipeline trace ONLY.
 * No gameplay / collision / respawn / balance mutations.
 *
 * Enable: ?debug=1  OR  localStorage.RC_DEATH_002 = "1"
 * Read:   window.__RC_DEATH_002__
 */
export type DeathTraceStage =
  | "near_miss"
  | "collision_detect"
  | "kill_snake_enter"
  | "alive_false"
  | "death_event_publish"
  | "respawn_scheduler"
  | "respawn_execute"
  | "alive_true"
  | "spawn_complete"
  | "merge_alive_conflict"
  | "invincible_block";

export interface DeathTraceEvent {
  t: number;
  stage: DeathTraceStage;
  tick?: number;
  victimId?: string;
  victimBot?: boolean;
  killerId?: string;
  killerBot?: boolean;
  detail?: Record<string, unknown>;
}

const MAX = 400;

type Store = {
  rc: "RC-DEATH-002";
  enabled: boolean;
  events: DeathTraceEvent[];
  counts: Record<string, number>;
  last: DeathTraceEvent | null;
};

function empty(): Store {
  return {
    rc: "RC-DEATH-002",
    enabled: false,
    events: [],
    counts: {},
    last: null,
  };
}

let store: Store = empty();

export function isDeathTraceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("debug") === "1") return true;
    if (window.localStorage?.getItem("RC_DEATH_002") === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

function publish(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    __RC_DEATH_002__?: Store & { summary?: () => ReturnType<typeof deathTraceSummary> };
  };
  store.enabled = store.enabled || isDeathTraceEnabled();
  w.__RC_DEATH_002__ = Object.assign(store, { summary: deathTraceSummary });
}

export function initDeathTrace(): void {
  store = empty();
  store.enabled = isDeathTraceEnabled();
  publish();
  if (store.enabled && typeof console !== "undefined") {
    console.info("[RC-DEATH-002] pipeline trace ON — window.__RC_DEATH_002__");
  }
}

export function deathTrace(stage: DeathTraceStage, payload: Omit<DeathTraceEvent, "t" | "stage"> = {}): void {
  if (typeof window === "undefined") return;
  if (!store.enabled && !isDeathTraceEnabled()) return;
  store.enabled = true;
  const ev: DeathTraceEvent = { t: Date.now(), stage, ...payload };
  store.events.push(ev);
  if (store.events.length > MAX) store.events.splice(0, store.events.length - MAX);
  store.counts[stage] = (store.counts[stage] ?? 0) + 1;
  store.last = ev;
  publish();
  if (typeof console !== "undefined") {
    const who = payload.victimId ? ` victim=${payload.victimId}${payload.victimBot ? "(bot)" : "(human)"}` : "";
    const by = payload.killerId ? ` killer=${payload.killerId}${payload.killerBot ? "(bot)" : "(human)"}` : "";
    console.info(`[RC-DEATH-002] ${stage}${who}${by}`, payload.detail ?? "");
  }
}

/** Compact summary for Playwright / CPO reports */
export function deathTraceSummary(): {
  enabled: boolean;
  counts: Record<string, number>;
  pipelineBreak: string | null;
  lastHumanDeath: DeathTraceEvent | null;
  recent: DeathTraceEvent[];
} {
  const counts = { ...store.counts };
  const humanDeaths = store.events.filter((e) => e.stage === "alive_false" && e.victimBot === false);
  const lastHumanDeath = humanDeaths[humanDeaths.length - 1] ?? null;

  // Infer first missing link for a human death attempt (or overall absence)
  let pipelineBreak: string | null = null;
  if ((counts.collision_detect ?? 0) === 0) {
    pipelineBreak = "no collision_detect (player never hit body / never evaluated hit)";
  } else if ((counts.kill_snake_enter ?? 0) === 0) {
    pipelineBreak = "collision_detect without kill_snake_enter (blocked after hit?)";
  } else if ((counts.alive_false ?? 0) === 0) {
    pipelineBreak = "kill_snake_enter without alive_false";
  } else if (!lastHumanDeath && (counts.alive_false ?? 0) > 0) {
    pipelineBreak = "alive_false only for bots — human death never observed";
  } else if (lastHumanDeath && (counts.merge_alive_conflict ?? 0) > 0) {
    pipelineBreak = "human death then merge_alive_conflict (host/local alive overwrite)";
  } else if (lastHumanDeath) {
    pipelineBreak = null;
  }

  return {
    enabled: store.enabled,
    counts,
    pipelineBreak,
    lastHumanDeath,
    recent: store.events.slice(-40),
  };
}
