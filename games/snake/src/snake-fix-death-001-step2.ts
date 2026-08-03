/**
 * FIX-DEATH-001 Step2 — can human approach collision radius?
 * Observe only: min distance time series, nearest kind, break reason, who turns.
 *
 * Enable: ?debug=1
 * Read: window.__FIX_DEATH_001_S2__
 */
import { SNAKE_FEEL } from "./snake-feel-tuning";

export type ApproachBreakReason =
  | "none"
  | "self_turn_away"
  | "other_turn_away"
  | "both_turn_away"
  | "other_escape_ai"
  | "self_invincible"
  | "other_invincible"
  | "opening_no_turn"
  | "unknown";

export type NearestKind = "bot" | "human";

export interface FixDeath001S2Sample {
  t: number;
  tick: number;
  /** Collision metric: head → other body segments[i≥1] */
  minBodyDist: number;
  /** Visual proxy: head → other head */
  minHeadDist: number;
  nearestId: string;
  nearestKind: NearestKind;
  nearestSegIndex: number;
  threshold: number;
  selfInvincible: boolean;
  otherInvincible: boolean;
  otherBotState: string | null;
  closingRate: number | null;
  turnActor: "self" | "other" | "both" | "neither";
  breakReason: ApproachBreakReason;
  selfAngle: number | null;
  otherAngle: number | null;
}

const MAX = 200;
const NEAR_BAND = 25; // observe turn/break when closer than this

type Store = {
  rc: "FIX-DEATH-001";
  step: "approach_floor";
  enabled: boolean;
  samples: FixDeath001S2Sample[];
  series: { tick: number; minBodyDist: number; minHeadDist: number; nearestKind: NearestKind }[];
  absoluteMinBody: number;
  absoluteMinHead: number;
  floorHitsAt13: number;
  belowThresholdCount: number;
  breakCounts: Record<string, number>;
  turnCounts: Record<string, number>;
  kindAtMin: NearestKind | null;
  lastBodyDist: number | null;
  lastSelfAngle: number | null;
  lastOtherAngle: number | null;
  lastNearestId: string | null;
};

let store: Store = emptyStore();

function emptyStore(): Store {
  return {
    rc: "FIX-DEATH-001",
    step: "approach_floor",
    enabled: false,
    samples: [],
    series: [],
    absoluteMinBody: Number.POSITIVE_INFINITY,
    absoluteMinHead: Number.POSITIVE_INFINITY,
    floorHitsAt13: 0,
    belowThresholdCount: 0,
    breakCounts: {},
    turnCounts: {},
    kindAtMin: null,
    lastBodyDist: null,
    lastSelfAngle: null,
    lastOtherAngle: null,
    lastNearestId: null,
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

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function classifyTurn(
  closingRate: number | null,
  selfMovingToward: boolean | null,
  otherMovingToward: boolean | null
): "self" | "other" | "both" | "neither" {
  if (closingRate == null || closingRate >= -0.05) return "neither";
  const selfAway = selfMovingToward === false;
  const otherAway = otherMovingToward === false;
  if (selfAway && otherAway) return "both";
  if (selfAway) return "self";
  if (otherAway) return "other";
  return "neither";
}

function classifyBreak(opts: {
  bodyDist: number;
  closingRate: number | null;
  turnActor: "self" | "other" | "both" | "neither";
  selfInvincible: boolean;
  otherInvincible: boolean;
  otherBotState: string | null;
}): ApproachBreakReason {
  const near = opts.bodyDist < NEAR_BAND;
  if (!near) return "none";
  if (opts.selfInvincible) return "self_invincible";
  if (opts.otherInvincible) return "other_invincible";
  if (opts.otherBotState === "escape") return "other_escape_ai";
  if (opts.closingRate != null && opts.closingRate < -0.05) {
    if (opts.turnActor === "self") return "self_turn_away";
    if (opts.turnActor === "other") return "other_turn_away";
    if (opts.turnActor === "both") return "both_turn_away";
    return "opening_no_turn";
  }
  return "none";
}

export function initFixDeath001Step2(): void {
  store = emptyStore();
  store.enabled = enabled();
  publish();
  if (store.enabled) {
    console.info("[FIX-DEATH-001][S2] approach floor probe ON — window.__FIX_DEATH_001_S2__");
  }
}

function publish(): void {
  if (typeof window === "undefined") return;
  store.enabled = store.enabled || enabled();
  (
    window as Window & {
      __FIX_DEATH_001_S2__?: Store & { summary?: () => ReturnType<typeof fixDeath001S2Summary> };
    }
  ).__FIX_DEATH_001_S2__ = Object.assign(store, { summary: fixDeath001S2Summary });
}

export function fixDeath001S2Summary(): {
  enabled: boolean;
  sampleCount: number;
  absoluteMinBody: number | null;
  absoluteMinHead: number | null;
  threshold: number;
  canReachCollisionRadius: boolean | null;
  floorHitsAt13: number;
  belowThresholdCount: number;
  kindAtMin: NearestKind | null;
  topBreakReasons: { reason: string; count: number }[];
  topTurnActors: { actor: string; count: number }[];
  verdict:
    | "CAN_APPROACH"
    | "FLOOR_NEAR_13"
    | "NEVER_NEAR"
    | "SPAWN_PROTECTED"
    | "BOT_ESCAPE"
    | "SELF_STEER"
    | "OTHER_STEER"
    | "unknown";
  proof: string;
} {
  const thr = SNAKE_FEEL.collisionRadius * 1.8;
  const n = store.samples.length;
  if (n === 0) {
    return {
      enabled: store.enabled,
      sampleCount: 0,
      absoluteMinBody: null,
      absoluteMinHead: null,
      threshold: thr,
      canReachCollisionRadius: null,
      floorHitsAt13: 0,
      belowThresholdCount: 0,
      kindAtMin: null,
      topBreakReasons: [],
      topTurnActors: [],
      verdict: "unknown",
      proof: "no samples",
    };
  }

  const absBody = Number.isFinite(store.absoluteMinBody) ? store.absoluteMinBody : null;
  const absHead = Number.isFinite(store.absoluteMinHead) ? store.absoluteMinHead : null;
  const can = absBody != null ? absBody < thr : null;

  const topBreak = Object.entries(store.breakCounts)
    .filter(([k]) => k !== "none")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));
  const topTurn = Object.entries(store.turnCounts)
    .filter(([k]) => k !== "neither")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([actor, count]) => ({ actor, count }));

  let verdict:
    | "CAN_APPROACH"
    | "FLOOR_NEAR_13"
    | "NEVER_NEAR"
    | "SPAWN_PROTECTED"
    | "BOT_ESCAPE"
    | "SELF_STEER"
    | "OTHER_STEER"
    | "unknown" = "unknown";
  let proof = "";

  if (can === true) {
    verdict = "CAN_APPROACH";
    proof = `human reached bodyDist=${absBody!.toFixed(3)} < threshold=${thr} (kind=${store.kindAtMin})`;
  } else if ((store.breakCounts.self_invincible ?? 0) + (store.breakCounts.other_invincible ?? 0) > n * 0.3) {
    verdict = "SPAWN_PROTECTED";
    proof = `frequent invincible while near; absMinBody=${absBody?.toFixed(3)} thr=${thr}`;
  } else if ((store.breakCounts.other_escape_ai ?? 0) >= 8) {
    verdict = "BOT_ESCAPE";
    proof = `other botState=escape dominates near band; absMinBody=${absBody?.toFixed(3)} thr=${thr}`;
  } else if ((store.breakCounts.self_turn_away ?? 0) >= (store.breakCounts.other_turn_away ?? 0) && (store.breakCounts.self_turn_away ?? 0) >= 5) {
    verdict = "SELF_STEER";
    proof = `self turns away near approach; absMinBody=${absBody?.toFixed(3)} thr=${thr}`;
  } else if ((store.breakCounts.other_turn_away ?? 0) >= 5) {
    verdict = "OTHER_STEER";
    proof = `other turns away near approach; absMinBody=${absBody?.toFixed(3)} thr=${thr}`;
  } else if (absBody != null && absBody > 40) {
    verdict = "NEVER_NEAR";
    proof = `never entered near band meaningfully; absMinBody=${absBody.toFixed(3)} thr=${thr}`;
  } else if (absBody != null && absBody >= 10 && absBody < 20 && store.floorHitsAt13 >= 3) {
    verdict = "FLOOR_NEAR_13";
    proof = `bodyDist floors ~13 (hits=${store.floorHitsAt13}, absMin=${absBody.toFixed(3)}); topBreak=${topBreak[0]?.reason ?? "n/a"} topTurn=${topTurn[0]?.actor ?? "n/a"}`;
  } else {
    verdict = "FLOOR_NEAR_13";
    proof = `absMinBody=${absBody?.toFixed(3)} thr=${thr}; topBreak=${topBreak[0]?.reason ?? "n/a"}; topTurn=${topTurn[0]?.actor ?? "n/a"}`;
  }

  return {
    enabled: store.enabled,
    sampleCount: n,
    absoluteMinBody: absBody,
    absoluteMinHead: absHead,
    threshold: thr,
    canReachCollisionRadius: can,
    floorHitsAt13: store.floorHitsAt13,
    belowThresholdCount: store.belowThresholdCount,
    kindAtMin: store.kindAtMin,
    topBreakReasons: topBreak,
    topTurnActors: topTurn,
    verdict,
    proof,
  };
}

export interface ApproachObserveInput {
  tick: number;
  now: number;
  threshold: number;
  selfId: string;
  selfHead: { x: number; y: number };
  selfAngle: number | null;
  selfInvincibleUntil: number | undefined;
  nearestBodyDist: number;
  nearestBodyId: string | undefined;
  nearestSegIndex: number;
  other:
    | {
        id: string;
        isBot: boolean;
        head: { x: number; y: number } | null;
        angle: number | null;
        invincibleUntil: number | undefined;
        botState: string | null;
      }
    | null;
}

/** Call on human victim collision scan ticks only. No gameplay effect. */
export function noteFixDeath001Approach(input: ApproachObserveInput): void {
  if (typeof window === "undefined") return;
  if (!store.enabled && !enabled()) return;
  store.enabled = true;

  const headDist =
    input.other?.head != null
      ? Math.hypot(input.selfHead.x - input.other.head.x, input.selfHead.y - input.other.head.y)
      : Number.POSITIVE_INFINITY;
  const bodyDist = input.nearestBodyDist;
  const kind: NearestKind = input.other?.isBot ? "bot" : "human";
  const selfInv = !!(input.selfInvincibleUntil && input.now < input.selfInvincibleUntil);
  const otherInv = !!(input.other?.invincibleUntil && input.now < input.other.invincibleUntil);

  const closingRate =
    store.lastBodyDist != null && store.lastNearestId === input.nearestBodyId
      ? store.lastBodyDist - bodyDist
      : store.lastBodyDist != null
        ? store.lastBodyDist - bodyDist
        : null;

  // Heading toward nearest body: positive cos means moving closer along self heading
  let selfToward: boolean | null = null;
  if (input.selfAngle != null && input.other?.head) {
    const toX = input.other.head.x - input.selfHead.x;
    const toY = input.other.head.y - input.selfHead.y;
    const len = Math.hypot(toX, toY) || 1;
    const vx = Math.cos(input.selfAngle);
    const vy = Math.sin(input.selfAngle);
    selfToward = (vx * toX + vy * toY) / len > 0.15;
  }
  let otherToward: boolean | null = null;
  if (input.other?.angle != null && input.other.head) {
    const toX = input.selfHead.x - input.other.head.x;
    const toY = input.selfHead.y - input.other.head.y;
    const len = Math.hypot(toX, toY) || 1;
    const vx = Math.cos(input.other.angle);
    const vy = Math.sin(input.other.angle);
    otherToward = (vx * toX + vy * toY) / len > 0.15;
  }

  const turnActor = classifyTurn(closingRate, selfToward, otherToward);
  const breakReason = classifyBreak({
    bodyDist,
    closingRate,
    turnActor,
    selfInvincible: selfInv,
    otherInvincible: otherInv,
    otherBotState: input.other?.botState ?? null,
  });

  const sample: FixDeath001S2Sample = {
    t: Date.now(),
    tick: input.tick,
    minBodyDist: bodyDist,
    minHeadDist: headDist,
    nearestId: input.nearestBodyId ?? "none",
    nearestKind: kind,
    nearestSegIndex: input.nearestSegIndex,
    threshold: input.threshold,
    selfInvincible: selfInv,
    otherInvincible: otherInv,
    otherBotState: input.other?.botState ?? null,
    closingRate,
    turnActor,
    breakReason,
    selfAngle: input.selfAngle,
    otherAngle: input.other?.angle ?? null,
  };

  store.samples.push(sample);
  if (store.samples.length > MAX) store.samples.splice(0, store.samples.length - MAX);

  store.series.push({
    tick: input.tick,
    minBodyDist: bodyDist,
    minHeadDist: Number.isFinite(headDist) ? headDist : bodyDist,
    nearestKind: kind,
  });
  if (store.series.length > MAX) store.series.splice(0, store.series.length - MAX);

  if (bodyDist < store.absoluteMinBody) {
    store.absoluteMinBody = bodyDist;
    store.kindAtMin = kind;
  }
  if (Number.isFinite(headDist) && headDist < store.absoluteMinHead) {
    store.absoluteMinHead = headDist;
  }
  if (bodyDist >= 12 && bodyDist <= 15) store.floorHitsAt13 += 1;
  if (bodyDist < input.threshold) store.belowThresholdCount += 1;
  bump(store.breakCounts, breakReason);
  if (bodyDist < NEAR_BAND && turnActor !== "neither") bump(store.turnCounts, turnActor);

  store.lastBodyDist = bodyDist;
  store.lastSelfAngle = input.selfAngle;
  store.lastOtherAngle = input.other?.angle ?? null;
  store.lastNearestId = input.nearestBodyId ?? null;

  publish();

  if (typeof console !== "undefined" && store.samples.length % 6 === 1) {
    console.info(
      `[FIX-DEATH-001][S2] body=${bodyDist.toFixed(2)} head=${Number.isFinite(headDist) ? headDist.toFixed(2) : "n/a"} kind=${kind} close=${closingRate?.toFixed(2) ?? "n/a"} turn=${turnActor} break=${breakReason} botState=${input.other?.botState ?? "-"}`
    );
  }
}
