/**
 * FIX-DEATH-001 Step1 — render vs physics head coordinate identity.
 * Observe only until mismatch is proven; then at most ONE source fix.
 *
 * Enable: ?debug=1
 * Read: window.__FIX_DEATH_001__
 */
export interface FixDeath001Sample {
  t: number;
  tick: number;
  deviceId: string;
  physicsSeg0: { x: number; y: number } | null;
  headXY: { x: number; y: number } | null;
  deltaPhysicsVsHeadXY: number | null;
  renderHead: { x: number; y: number } | null;
  deltaPhysicsVsRender: number | null;
}

const MAX = 120;

type Store = {
  rc: "FIX-DEATH-001";
  step: "render_vs_physics";
  enabled: boolean;
  samples: FixDeath001Sample[];
  mismatchPhysicsCount: number;
  mismatchRenderCount: number;
  maxDeltaPhysics: number;
  maxDeltaRender: number;
};

let store: Store = {
  rc: "FIX-DEATH-001",
  step: "render_vs_physics",
  enabled: false,
  samples: [],
  mismatchPhysicsCount: 0,
  mismatchRenderCount: 0,
  maxDeltaPhysics: 0,
  maxDeltaRender: 0,
};

function enabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("debug") === "1";
  } catch {
    return false;
  }
}

export function initFixDeath001(): void {
  store = {
    rc: "FIX-DEATH-001",
    step: "render_vs_physics",
    enabled: enabled(),
    samples: [],
    mismatchPhysicsCount: 0,
    mismatchRenderCount: 0,
    maxDeltaPhysics: 0,
    maxDeltaRender: 0,
  };
  publish();
  if (store.enabled) console.info("[FIX-DEATH-001] Step1 render vs physics ON — window.__FIX_DEATH_001__");
}

function publish(): void {
  if (typeof window === "undefined") return;
  store.enabled = store.enabled || enabled();
  (window as Window & { __FIX_DEATH_001__?: Store & { summary?: () => ReturnType<typeof fixDeath001Summary> } }).__FIX_DEATH_001__ =
    Object.assign(store, { summary: fixDeath001Summary });
}

export function fixDeath001Summary(): {
  enabled: boolean;
  mismatchPhysicsCount: number;
  mismatchRenderCount: number;
  maxDeltaPhysics: number;
  maxDeltaRender: number;
  sampleCount: number;
  verdict: "MATCH" | "MISMATCH_PHYSICS_HEADXY" | "RENDER_INTERP_ONLY" | "unknown";
  proof: string;
} {
  const n = store.samples.length;
  if (n === 0) {
    return {
      enabled: store.enabled,
      mismatchPhysicsCount: 0,
      mismatchRenderCount: 0,
      maxDeltaPhysics: 0,
      maxDeltaRender: 0,
      sampleCount: 0,
      verdict: "unknown",
      proof: "no samples",
    };
  }
  // Physics identity: seg0 vs headXY should be ~0 after sync
  if (store.maxDeltaPhysics > 0.05) {
    return {
      enabled: store.enabled,
      mismatchPhysicsCount: store.mismatchPhysicsCount,
      mismatchRenderCount: store.mismatchRenderCount,
      maxDeltaPhysics: store.maxDeltaPhysics,
      maxDeltaRender: store.maxDeltaRender,
      sampleCount: n,
      verdict: "MISMATCH_PHYSICS_HEADXY",
      proof: `segments[0] vs headX/Y diverge (maxΔ=${store.maxDeltaPhysics.toFixed(3)}) — collision source bug`,
    };
  }
  // Render interp can differ mid-frame; if only this, physics source is consistent
  if (store.maxDeltaRender > 0.5) {
    return {
      enabled: store.enabled,
      mismatchPhysicsCount: store.mismatchPhysicsCount,
      mismatchRenderCount: store.mismatchRenderCount,
      maxDeltaPhysics: store.maxDeltaPhysics,
      maxDeltaRender: store.maxDeltaRender,
      sampleCount: n,
      verdict: "RENDER_INTERP_ONLY",
      proof: `physics seg0≈headXY (maxΔ=${store.maxDeltaPhysics.toFixed(3)}); render lerp differs (maxΔ=${store.maxDeltaRender.toFixed(3)}) — expected interp, not collision source bug`,
    };
  }
  return {
    enabled: store.enabled,
    mismatchPhysicsCount: store.mismatchPhysicsCount,
    mismatchRenderCount: store.mismatchRenderCount,
    maxDeltaPhysics: store.maxDeltaPhysics,
    maxDeltaRender: store.maxDeltaRender,
    sampleCount: n,
    verdict: "MATCH",
    proof: `physics seg0≈headXY≈render (maxΔphys=${store.maxDeltaPhysics.toFixed(3)}, maxΔrender=${store.maxDeltaRender.toFixed(3)})`,
  };
}

export function noteFixDeath001Sample(sample: Omit<FixDeath001Sample, "t">): void {
  if (typeof window === "undefined") return;
  if (!store.enabled && !enabled()) return;
  store.enabled = true;
  const full: FixDeath001Sample = { t: Date.now(), ...sample };
  store.samples.push(full);
  if (store.samples.length > MAX) store.samples.splice(0, store.samples.length - MAX);
  if (full.deltaPhysicsVsHeadXY != null && full.deltaPhysicsVsHeadXY > 0.05) {
    store.mismatchPhysicsCount += 1;
    store.maxDeltaPhysics = Math.max(store.maxDeltaPhysics, full.deltaPhysicsVsHeadXY);
  } else if (full.deltaPhysicsVsHeadXY != null) {
    store.maxDeltaPhysics = Math.max(store.maxDeltaPhysics, full.deltaPhysicsVsHeadXY);
  }
  if (full.deltaPhysicsVsRender != null && full.deltaPhysicsVsRender > 0.5) {
    store.mismatchRenderCount += 1;
    store.maxDeltaRender = Math.max(store.maxDeltaRender, full.deltaPhysicsVsRender);
  } else if (full.deltaPhysicsVsRender != null) {
    store.maxDeltaRender = Math.max(store.maxDeltaRender, full.deltaPhysicsVsRender);
  }
  publish();
  if (typeof console !== "undefined" && store.samples.length % 8 === 1) {
    console.info(
      `[FIX-DEATH-001] phys=${full.physicsSeg0 ? `(${full.physicsSeg0.x.toFixed(1)},${full.physicsSeg0.y.toFixed(1)})` : "null"} headXY=${full.headXY ? `(${full.headXY.x.toFixed(1)},${full.headXY.y.toFixed(1)})` : "null"} Δphys=${full.deltaPhysicsVsHeadXY?.toFixed(3) ?? "n/a"} render=${full.renderHead ? `(${full.renderHead.x.toFixed(1)},${full.renderHead.y.toFixed(1)})` : "null"} Δrender=${full.deltaPhysicsVsRender?.toFixed(3) ?? "n/a"}`
    );
  }
}
