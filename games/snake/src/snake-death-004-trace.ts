/**
 * RC-DEATH-004 — Distance / threshold unit verification ONLY.
 * Last instrumentation RC before fix (RC-DEATH-005).
 *
 * Enable: ?debug=1
 * Read:   window.__RC_DEATH_004__
 *
 * PASS = Case1 (unit mismatch) OR Case2 (same units, still reject)
 */
export interface Death004Sample {
  t: number;
  tick: number;
  victimId: string;
  otherId: string;
  head: { x: number; y: number };
  segment: { x: number; y: number };
  distance: number;
  threshold: number;
  headRadius: number;
  segmentRadius: number;
  collisionRadius: number;
  thresholdFormula: string;
  worldSize: number;
  detail?: Record<string, unknown>;
}

const MAX = 200;

type Store = {
  rc: "RC-DEATH-004";
  enabled: boolean;
  samples: Death004Sample[];
  last: Death004Sample | null;
};

function empty(): Store {
  return { rc: "RC-DEATH-004", enabled: false, samples: [], last: null };
}

let store: Store = empty();

export function isDeath004Enabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("debug") === "1") return true;
    if (window.localStorage?.getItem("RC_DEATH_004") === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

function magnitude(v: { x: number; y: number }): number {
  return Math.hypot(v.x, v.y);
}

/** Infer coordinate scale family from sample magnitudes vs known constants */
export function death004Summary(): {
  enabled: boolean;
  sampleCount: number;
  case: "1_unit_mismatch" | "2_same_unit_far" | "unknown";
  proof: string;
  minDistance: number | null;
  maxDistance: number | null;
  threshold: number | null;
  ratioMinDistOverThreshold: number | null;
  headMagMedian: number | null;
  segMagMedian: number | null;
  worldSize: number | null;
  recent: Death004Sample[];
} {
  const samples = store.samples;
  if (samples.length === 0) {
    return {
      enabled: store.enabled,
      sampleCount: 0,
      case: "unknown",
      proof: "no samples",
      minDistance: null,
      maxDistance: null,
      threshold: null,
      ratioMinDistOverThreshold: null,
      headMagMedian: null,
      segMagMedian: null,
      worldSize: null,
      recent: [],
    };
  }

  const dists = samples.map((s) => s.distance).sort((a, b) => a - b);
  const heads = samples.map((s) => magnitude(s.head)).sort((a, b) => a - b);
  const segs = samples.map((s) => magnitude(s.segment)).sort((a, b) => a - b);
  const mid = (arr: number[]) => arr[Math.floor(arr.length / 2)]!;
  const minD = dists[0]!;
  const maxD = dists[dists.length - 1]!;
  const thr = samples[0]!.threshold;
  const worldSize = samples[0]!.worldSize;
  const headMed = mid(heads);
  const segMed = mid(segs);
  const ratio = minD / thr;

  // Case 1: head/seg lives on incompatible scales OR threshold not in world-radius family
  const headWorldLike = headMed > 10 && headMed < worldSize * 2;
  const segWorldLike = segMed > 10 && segMed < worldSize * 2;
  const thrRadiusLike = thr > 0.05 && thr < 5; // feel radii live ~0.2–2
  const sameFamily = headWorldLike && segWorldLike && thrRadiusLike;

  let proofCase: "1_unit_mismatch" | "2_same_unit_far" | "unknown" = "unknown";
  let proof = "";

  if (!headWorldLike || !segWorldLike) {
    proofCase = "1_unit_mismatch";
    proof = `head/seg magnitude not world-like (headMed=${headMed.toFixed(2)}, segMed=${segMed.toFixed(2)}, worldSize=${worldSize})`;
  } else if (!thrRadiusLike && (thr > 50 || thr < 0.001)) {
    proofCase = "1_unit_mismatch";
    proof = `threshold not in feel-radius family (threshold=${thr}, headRadius=${samples[0]!.headRadius}, bodyRadius=${samples[0]!.segmentRadius})`;
  } else if (sameFamily && ratio > 10) {
    proofCase = "2_same_unit_far";
    proof = `same unit family; minDistance=${minD.toFixed(3)} vs threshold=${thr} (ratio=${ratio.toFixed(1)}x) — far reject, not unit bug`;
  } else if (sameFamily) {
    proofCase = "2_same_unit_far";
    proof = `same unit family; distances still reject (min=${minD.toFixed(3)}, thr=${thr})`;
  } else {
    proofCase = "1_unit_mismatch";
    proof = `scale families disagree (headWorldLike=${headWorldLike}, segWorldLike=${segWorldLike}, thrRadiusLike=${thrRadiusLike})`;
  }

  return {
    enabled: store.enabled,
    sampleCount: samples.length,
    case: proofCase,
    proof,
    minDistance: minD,
    maxDistance: maxD,
    threshold: thr,
    ratioMinDistOverThreshold: ratio,
    headMagMedian: headMed,
    segMagMedian: segMed,
    worldSize,
    recent: samples.slice(-40),
  };
}

function publish(): void {
  if (typeof window === "undefined") return;
  store.enabled = store.enabled || isDeath004Enabled();
  const w = window as Window & {
    __RC_DEATH_004__?: Store & { summary?: () => ReturnType<typeof death004Summary> };
  };
  w.__RC_DEATH_004__ = Object.assign(store, { summary: death004Summary });
}

export function initDeath004Trace(): void {
  store = empty();
  store.enabled = isDeath004Enabled();
  publish();
  if (store.enabled && typeof console !== "undefined") {
    console.info("[RC-DEATH-004] distance/threshold unit probe ON — window.__RC_DEATH_004__");
  }
}

export function death004Sample(sample: Omit<Death004Sample, "t">): void {
  if (typeof window === "undefined") return;
  if (!store.enabled && !isDeath004Enabled()) return;
  store.enabled = true;
  const full: Death004Sample = { t: Date.now(), ...sample };
  store.samples.push(full);
  if (store.samples.length > MAX) store.samples.splice(0, store.samples.length - MAX);
  store.last = full;
  publish();
  if (typeof console !== "undefined") {
    const reject = full.distance > full.threshold ? "distance_gt_threshold" : "none";
    console.info(
      `[RC-DEATH-004] candidate self=(${full.head.x.toFixed(1)},${full.head.y.toFixed(1)}) other=(${full.segment.x.toFixed(1)},${full.segment.y.toFixed(1)}) distance=${full.distance.toFixed(2)} threshold=${full.threshold.toFixed(2)} reject=${reject}`
    );
  }
}
