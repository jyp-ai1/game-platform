/**
 * RC-DEATH-003 — Human Collision Detection Pipeline trace ONLY.
 * No collision / hitbox / radius / killSnake / respawn mutations.
 *
 * Enable: ?debug=1  OR  localStorage.RC_DEATH_003 = "1"
 * Read:   window.__RC_DEATH_003__
 *
 * Success = prove Case A (candidate=0) OR Case B (candidate>0 + reject reason).
 */
export type Death003Stage =
  | "tick_skip"
  | "evaluator_enter"
  | "candidate"
  | "evaluate"
  | "reject"
  | "hit"
  | "kill_snake_call";

export type Death003RejectReason =
  | "other_not_alive"
  | "other_spectating"
  | "self"
  | "other_invincible"
  | "body_empty"
  | "distance_gt_threshold"
  | "victim_invincible";

export interface Death003Event {
  t: number;
  stage: Death003Stage;
  tick?: number;
  victimId?: string;
  otherId?: string;
  reason?: Death003RejectReason | string;
  detail?: Record<string, unknown>;
}

const MAX = 800;

type Store = {
  rc: "RC-DEATH-003";
  enabled: boolean;
  events: Death003Event[];
  counts: Record<string, number>;
  rejectReasons: Record<string, number>;
  candidateTotal: number;
  evaluatorEnterHuman: number;
  hitHuman: number;
  last: Death003Event | null;
};

function empty(): Store {
  return {
    rc: "RC-DEATH-003",
    enabled: false,
    events: [],
    counts: {},
    rejectReasons: {},
    candidateTotal: 0,
    evaluatorEnterHuman: 0,
    hitHuman: 0,
    last: null,
  };
}

let store: Store = empty();

export function isDeath003Enabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("debug") === "1") return true;
    if (window.localStorage?.getItem("RC_DEATH_003") === "1") return true;
    // inherit RC-DEATH-002 debug sessions
    if (window.localStorage?.getItem("RC_DEATH_002") === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function death003Summary(): {
  enabled: boolean;
  counts: Record<string, number>;
  rejectReasons: Record<string, number>;
  candidateTotal: number;
  evaluatorEnterHuman: number;
  hitHuman: number;
  case: "A_candidate_zero" | "B_reject" | "C_hit_reached" | "D_evaluator_never" | "unknown";
  proof: string;
  recent: Death003Event[];
} {
  const candidateTotal = store.candidateTotal;
  const evalEnter = store.evaluatorEnterHuman;
  const hitHuman = store.hitHuman;
  const rejects = { ...store.rejectReasons };

  let proofCase: "A_candidate_zero" | "B_reject" | "C_hit_reached" | "D_evaluator_never" | "unknown" = "unknown";
  let proof = "insufficient samples";

  if (evalEnter === 0) {
    proofCase = "D_evaluator_never";
    proof = "Human never entered collision evaluator (moveSnakePath collision block)";
  } else if (candidateTotal === 0) {
    proofCase = "A_candidate_zero";
    proof = "evaluator entered but candidate=0 (no other snakes considered)";
  } else if (hitHuman > 0) {
    proofCase = "C_hit_reached";
    proof = "human collision hit reached — check killSnake / downstream";
  } else {
    proofCase = "B_reject";
    const top = Object.entries(rejects).sort((a, b) => b[1] - a[1])[0];
    proof = top
      ? `candidate>0 but all rejected; top reason=${top[0]} ×${top[1]}`
      : "candidate>0 but no reject/hit logged";
  }

  return {
    enabled: store.enabled,
    counts: { ...store.counts },
    rejectReasons: rejects,
    candidateTotal,
    evaluatorEnterHuman: evalEnter,
    hitHuman,
    case: proofCase,
    proof,
    recent: store.events.slice(-60),
  };
}

function publish(): void {
  if (typeof window === "undefined") return;
  store.enabled = store.enabled || isDeath003Enabled();
  const w = window as Window & {
    __RC_DEATH_003__?: Store & { summary?: () => ReturnType<typeof death003Summary> };
  };
  w.__RC_DEATH_003__ = Object.assign(store, { summary: death003Summary });
}

export function initDeath003Trace(): void {
  store = empty();
  store.enabled = isDeath003Enabled();
  publish();
  if (store.enabled && typeof console !== "undefined") {
    console.info("[RC-DEATH-003] human collision pipeline ON — window.__RC_DEATH_003__");
  }
}

export function death003(stage: Death003Stage, payload: Omit<Death003Event, "t" | "stage"> = {}): void {
  if (typeof window === "undefined") return;
  if (!store.enabled && !isDeath003Enabled()) return;
  store.enabled = true;

  const ev: Death003Event = { t: Date.now(), stage, ...payload };
  store.events.push(ev);
  if (store.events.length > MAX) store.events.splice(0, store.events.length - MAX);
  store.counts[stage] = (store.counts[stage] ?? 0) + 1;
  store.last = ev;

  if (stage === "evaluator_enter") store.evaluatorEnterHuman += 1;
  if (stage === "candidate") store.candidateTotal += 1;
  if (stage === "hit") store.hitHuman += 1;
  if (stage === "reject" && payload.reason) {
    const r = String(payload.reason);
    store.rejectReasons[r] = (store.rejectReasons[r] ?? 0) + 1;
  }

  publish();
  if (typeof console !== "undefined") {
    const extra = payload.reason ? ` reason=${payload.reason}` : "";
    const other = payload.otherId ? ` other=${payload.otherId}` : "";
    console.info(`[RC-DEATH-003] ${stage}${other}${extra}`, payload.detail ?? "");
  }
}
