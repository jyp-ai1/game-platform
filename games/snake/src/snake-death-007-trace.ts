/**
 * RC-DEATH-007 — Death UX only (observe). No engine/collision/respawn changes.
 *
 * Enable: ?debug=1
 * Read: window.__RC_DEATH_007__
 */
export type DeathUxMode = "world_countdown" | "private_gameover" | "stage" | "none";

export interface Death007Snapshot {
  t: number;
  phase: "alive" | "dead_overlay" | "countdown" | "respawned";
  isGlobalWorld: boolean;
  alive: boolean;
  spectating: boolean;
  respawnSec: number | null;
  hasRespawnAt: boolean;
  /** WORLD: countdown overlay expected; private: GameOver Retry/Exit */
  expectedMode: DeathUxMode;
  overlayVisible: boolean;
  countdownVisible: boolean;
  retryExitPolicyOk: boolean;
  overlayRemovedAfterRespawn: boolean | null;
}

type Store = {
  rc: "RC-DEATH-007";
  enabled: boolean;
  samples: Death007Snapshot[];
  sawDeathOverlay: boolean;
  sawCountdown: boolean;
  sawRetryExitPolicy: boolean;
  sawOverlayRemoved: boolean;
  forceDeathFn: (() => boolean) | null;
};

let store: Store = empty();
let wasDead = false;

function empty(): Store {
  return {
    rc: "RC-DEATH-007",
    enabled: false,
    samples: [],
    sawDeathOverlay: false,
    sawCountdown: false,
    sawRetryExitPolicy: false,
    sawOverlayRemoved: false,
    forceDeathFn: null,
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

export function initDeath007Trace(): void {
  store = empty();
  wasDead = false;
  store.enabled = enabled();
  publish();
  if (store.enabled) console.info("[RC-DEATH-007] Death UX probe ON — window.__RC_DEATH_007__");
}

function publish(): void {
  if (typeof window === "undefined") return;
  store.enabled = store.enabled || enabled();
  (
    window as Window & {
      __RC_DEATH_007__?: Store & {
        summary?: () => ReturnType<typeof death007Summary>;
        forceLocalDeath?: () => boolean;
      };
    }
  ).__RC_DEATH_007__ = Object.assign(store, {
    summary: death007Summary,
    forceLocalDeath: () => store.forceDeathFn?.() ?? false,
  });
}

export function setDeath007ForceDeath(fn: () => boolean): void {
  store.forceDeathFn = fn;
  publish();
}

export function death007Summary(): {
  enabled: boolean;
  sampleCount: number;
  pass: {
    deathOverlay: boolean;
    countdown: boolean;
    retryExitPolicy: boolean;
    overlayRemoved: boolean;
  };
  passScore: string;
  verdict: "PASS" | "FAIL_OVERLAY" | "FAIL_COUNTDOWN" | "FAIL_POLICY" | "FAIL_REMOVE" | "NO_DEATH_UX";
  proof: string;
  last: Death007Snapshot | null;
} {
  const n = store.samples.length;
  const deathOverlay = store.sawDeathOverlay;
  const countdown = store.sawCountdown;
  const retryExitPolicy = store.sawRetryExitPolicy;
  const overlayRemoved = store.sawOverlayRemoved;
  const score = [deathOverlay, countdown, retryExitPolicy, overlayRemoved].filter(Boolean).length;

  let verdict:
    | "PASS"
    | "FAIL_OVERLAY"
    | "FAIL_COUNTDOWN"
    | "FAIL_POLICY"
    | "FAIL_REMOVE"
    | "NO_DEATH_UX" = "NO_DEATH_UX";
  if (n === 0) verdict = "NO_DEATH_UX";
  else if (score === 4) verdict = "PASS";
  else if (!deathOverlay) verdict = "FAIL_OVERLAY";
  else if (!countdown) verdict = "FAIL_COUNTDOWN";
  else if (!retryExitPolicy) verdict = "FAIL_POLICY";
  else if (!overlayRemoved) verdict = "FAIL_REMOVE";

  return {
    enabled: store.enabled,
    sampleCount: n,
    pass: { deathOverlay, countdown, retryExitPolicy, overlayRemoved },
    passScore: `${score} / 4`,
    verdict: score === 4 ? "PASS" : verdict,
    proof: `samples=${n} overlay=${deathOverlay} countdown=${countdown} policy=${retryExitPolicy} removed=${overlayRemoved}`,
    last: store.samples[store.samples.length - 1] ?? null,
  };
}

export function noteDeath007Ux(input: {
  isGlobalWorld: boolean;
  isStageMode: boolean;
  alive: boolean;
  spectating: boolean;
  respawnSec: number | null;
  hasRespawnAt: boolean;
  /** DOM / React visibility */
  countdownDomVisible: boolean;
  gameOverDomVisible: boolean;
}): void {
  if (typeof window === "undefined") return;
  if (!store.enabled && !enabled()) return;
  store.enabled = true;

  let expectedMode: DeathUxMode = "none";
  if (input.isStageMode) expectedMode = "stage";
  else if (input.isGlobalWorld) expectedMode = "world_countdown";
  else expectedMode = "private_gameover";

  const dead = !input.alive;
  const overlayVisible = dead && (input.countdownDomVisible || input.gameOverDomVisible);
  const countdownVisible = dead && input.isGlobalWorld && input.countdownDomVisible;
  // Policy: WORLD → countdown only (no Retry/Exit). Private → GameOver with Retry/Exit. No crossover.
  const retryExitPolicyOk = input.isStageMode
    ? true
    : input.isGlobalWorld
      ? dead
        ? !input.gameOverDomVisible && (input.countdownDomVisible || input.respawnSec != null)
        : true
      : dead
        ? input.gameOverDomVisible && !input.countdownDomVisible
        : true;

  let phase: Death007Snapshot["phase"] = "alive";
  if (dead && overlayVisible) phase = countdownVisible ? "countdown" : "dead_overlay";
  if (!dead && wasDead) phase = "respawned";

  if (dead && overlayVisible) store.sawDeathOverlay = true;
  if (countdownVisible || (dead && input.isGlobalWorld && (input.respawnSec ?? 0) > 0)) {
    store.sawCountdown = true;
  }
  if (retryExitPolicyOk && dead) store.sawRetryExitPolicy = true;
  if (!dead && wasDead && !overlayVisible) store.sawOverlayRemoved = true;

  const snap: Death007Snapshot = {
    t: Date.now(),
    phase,
    isGlobalWorld: input.isGlobalWorld,
    alive: input.alive,
    spectating: input.spectating,
    respawnSec: input.respawnSec,
    hasRespawnAt: input.hasRespawnAt,
    expectedMode,
    overlayVisible,
    countdownVisible,
    retryExitPolicyOk,
    overlayRemovedAfterRespawn: !dead && wasDead ? !overlayVisible : null,
  };
  store.samples.push(snap);
  if (store.samples.length > 120) store.samples.splice(0, store.samples.length - 120);

  if (dead) wasDead = true;
  else if (wasDead && !dead) {
    /* keep wasDead for remove detection once */
  }

  publish();
  if (typeof console !== "undefined" && (dead || phase === "respawned")) {
    console.info(
      `[RC-DEATH-007] ${phase} alive=${input.alive} sec=${input.respawnSec} overlay=${overlayVisible} countdown=${countdownVisible} policy=${retryExitPolicyOk}`
    );
  }
}
