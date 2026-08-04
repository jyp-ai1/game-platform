/**
 * RC-LB-001 — Leaderboard Integrity (data consistency only).
 * HUD design / Collision / Performance out of scope.
 *
 * Enable: ?debug=1
 * Read: window.__RC_LB_001__
 */
export interface Lb001Sample {
  t: number;
  tick: number;
  deviceId: string;
  alive: boolean;
  engineLength: number;
  /** Length shown for local in rankingEntries (same source as TOP10 L) */
  top10Length: number | null;
  /** Score used for rank order */
  score: number;
  myRankByScore: number;
  /** Rank if sorted by length instead */
  myRankByLength: number;
  scoreOrderMatchesLengthOrder: boolean;
  duplicateDeviceIds: string[];
  deadInRankings: number;
  deadWithZeroSegments: number;
  rankingsCount: number;
  snakesCount: number;
}

type Store = {
  rc: "RC-LB-001";
  enabled: boolean;
  samples: Lb001Sample[];
  lengthMismatchCount: number;
  duplicateEvents: number;
  deadGhostEvents: number;
  rankOrderMismatchCount: number;
  maxEngineLength: number;
};

let store: Store = empty();

function empty(): Store {
  return {
    rc: "RC-LB-001",
    enabled: false,
    samples: [],
    lengthMismatchCount: 0,
    duplicateEvents: 0,
    deadGhostEvents: 0,
    rankOrderMismatchCount: 0,
    maxEngineLength: 0,
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

export function initLb001Trace(): void {
  store = empty();
  store.enabled = enabled();
  publish();
  if (store.enabled) console.info("[RC-LB-001] Leaderboard integrity probe ON — window.__RC_LB_001__");
}

function publish(): void {
  if (typeof window === "undefined") return;
  store.enabled = store.enabled || enabled();
  (
    window as Window & {
      __RC_LB_001__?: Store & { summary?: () => ReturnType<typeof lb001Summary> };
    }
  ).__RC_LB_001__ = Object.assign(store, { summary: lb001Summary });
}

export function lb001Summary(): {
  enabled: boolean;
  sampleCount: number;
  pass: {
    lengthSync: boolean;
    rankSync: boolean;
    noDuplicate: boolean;
    noDeadGhost: boolean;
  };
  passScore: string;
  verdict:
    | "PASS"
    | "FAIL_LENGTH"
    | "FAIL_RANK"
    | "FAIL_DUPLICATE"
    | "FAIL_GHOST"
    | "FAIL_PARTIAL"
    | "NO_SAMPLE";
  proof: string;
  last: Lb001Sample | null;
} {
  const n = store.samples.length;
  if (n === 0) {
    return {
      enabled: store.enabled,
      sampleCount: 0,
      pass: { lengthSync: false, rankSync: false, noDuplicate: false, noDeadGhost: false },
      passScore: "0 / 4",
      verdict: "NO_SAMPLE",
      proof: "no samples",
      last: null,
    };
  }
  const lengthSync = store.lengthMismatchCount === 0;
  const rankSync = store.rankOrderMismatchCount === 0;
  const noDuplicate = store.duplicateEvents === 0;
  const noDeadGhost = store.deadGhostEvents === 0;
  const score = [lengthSync, rankSync, noDuplicate, noDeadGhost].filter(Boolean).length;

  let verdict:
    | "PASS"
    | "FAIL_LENGTH"
    | "FAIL_RANK"
    | "FAIL_DUPLICATE"
    | "FAIL_GHOST"
    | "FAIL_PARTIAL"
    | "NO_SAMPLE" = "FAIL_PARTIAL";
  if (score === 4) verdict = "PASS";
  else if (!lengthSync) verdict = "FAIL_LENGTH";
  else if (!rankSync) verdict = "FAIL_RANK";
  else if (!noDuplicate) verdict = "FAIL_DUPLICATE";
  else if (!noDeadGhost) verdict = "FAIL_GHOST";

  return {
    enabled: store.enabled,
    sampleCount: n,
    pass: { lengthSync, rankSync, noDuplicate, noDeadGhost },
    passScore: `${score} / 4`,
    verdict,
    proof: `samples=${n} lenMismatch=${store.lengthMismatchCount} rankMismatch=${store.rankOrderMismatchCount} dup=${store.duplicateEvents} ghost=${store.deadGhostEvents} maxLen=${store.maxEngineLength}`,
    last: store.samples[store.samples.length - 1] ?? null,
  };
}

export function noteLb001Sample(input: {
  tick: number;
  deviceId: string;
  alive: boolean;
  engineLength: number;
  /** Local HUD length (should equal engineLength) */
  hudLength: number;
  /** Per display TOP10: deviceId → length shown */
  top10Lengths: Record<string, number>;
  score: number;
  rankings: { deviceId: string; score: number }[];
  snakes: { deviceId: string; alive: boolean; length: number }[];
}): void {
  if (typeof window === "undefined") return;
  if (!store.enabled && !enabled()) return;
  store.enabled = true;

  const ids = input.rankings.map((r) => r.deviceId);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  const uniqueDup = [...new Set(dup)];

  const byLength = [...input.snakes]
    .filter((s) => s.alive)
    .sort((a, b) => b.length - a.length || a.deviceId.localeCompare(b.deviceId));
  // Official leaderboard order = rankings array as stored (Length after FIX-LB-001)
  const rankingAliveOrder = input.rankings.filter((r) =>
    input.snakes.find((s) => s.deviceId === r.deviceId)?.alive
  );
  const myRankByScore =
    rankingAliveOrder.findIndex((r) => r.deviceId === input.deviceId) + 1 ||
    rankingAliveOrder.length + 1;
  const myRankByLength =
    byLength.findIndex((r) => r.deviceId === input.deviceId) + 1 || byLength.length + 1;

  let orderMatch = true;
  const n = Math.min(10, byLength.length, rankingAliveOrder.length);
  for (let i = 0; i < n; i++) {
    if (rankingAliveOrder[i]!.deviceId !== byLength[i]!.deviceId) {
      orderMatch = false;
      break;
    }
  }

  const deadInRankings = input.rankings.filter((r) => {
    const s = input.snakes.find((x) => x.deviceId === r.deviceId);
    return s && !s.alive;
  }).length;
  const deadWithZeroSegments = input.snakes.filter((s) => !s.alive && s.length === 0).length;

  let lengthMismatch = input.hudLength !== input.engineLength;
  for (const [id, shown] of Object.entries(input.top10Lengths)) {
    const eng = input.snakes.find((s) => s.deviceId === id)?.length;
    if (eng != null && eng !== shown) lengthMismatch = true;
  }

  const snap: Lb001Sample = {
    t: Date.now(),
    tick: input.tick,
    deviceId: input.deviceId,
    alive: input.alive,
    engineLength: input.engineLength,
    top10Length: input.top10Lengths[input.deviceId] ?? null,
    score: input.score,
    myRankByScore,
    myRankByLength,
    scoreOrderMatchesLengthOrder: orderMatch,
    duplicateDeviceIds: uniqueDup,
    deadInRankings,
    deadWithZeroSegments,
    rankingsCount: input.rankings.length,
    snakesCount: input.snakes.length,
  };

  store.samples.push(snap);
  if (store.samples.length > 150) store.samples.splice(0, store.samples.length - 150);
  if (lengthMismatch) store.lengthMismatchCount += 1;
  if (uniqueDup.length) store.duplicateEvents += 1;
  if (deadWithZeroSegments > 0 && deadInRankings > 0) store.deadGhostEvents += 1;
  if (!orderMatch) store.rankOrderMismatchCount += 1;
  store.maxEngineLength = Math.max(store.maxEngineLength, input.engineLength);

  publish();
  if (typeof console !== "undefined" && store.samples.length % 10 === 1) {
    console.info(
      `[RC-LB-001] len=${input.engineLength} hud=${input.hudLength} rankS=${myRankByScore} rankL=${myRankByLength} orderMatch=${orderMatch} dup=${uniqueDup.length} ghostDead=${deadInRankings}`
    );
  }
}
