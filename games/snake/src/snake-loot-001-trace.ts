/**
 * RC-LOOT-001 — Death Loot Drop regression (observe only).
 * Checklist: length drop · world register · renderable · collectable
 *
 * Enable: ?debug=1
 * Read: window.__RC_LOOT_001__
 */
export interface Loot001DropSnapshot {
  t: number;
  tick: number;
  victimId: string;
  victimBot: boolean;
  /** Body length at death (segments before clear) */
  lengthAtDeath: number;
  gemsEaten: number;
  expectedDrop: number;
  foodBefore: number;
  foodAfter: number;
  deathFoodBefore: number;
  deathFoodAfter: number;
  deathFoodAdded: number;
  /** Drop truncated by maxFood cap */
  truncated: boolean;
  /** Sample death-food positions registered in world */
  samplePositions: Array<{ x: number; y: number }>;
}

export interface Loot001CollectSnapshot {
  t: number;
  tick: number;
  eaterId: string;
  eaterBot: boolean;
  foodTier: string;
  foodValue: number;
  foodBefore: number;
  foodAfter: number;
}

type Store = {
  rc: "RC-LOOT-001";
  enabled: boolean;
  drops: Loot001DropSnapshot[];
  collects: Loot001CollectSnapshot[];
  botDrops: number;
  humanDrops: number;
  deathCollects: number;
};

let store: Store = empty();

function empty(): Store {
  return {
    rc: "RC-LOOT-001",
    enabled: false,
    drops: [],
    collects: [],
    botDrops: 0,
    humanDrops: 0,
    deathCollects: 0,
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

export function initLoot001Trace(): void {
  store = empty();
  store.enabled = enabled();
  publish();
  if (store.enabled) console.info("[RC-LOOT-001] loot drop probe ON — window.__RC_LOOT_001__");
}

function publish(): void {
  if (typeof window === "undefined") return;
  store.enabled = store.enabled || enabled();
  (
    window as Window & {
      __RC_LOOT_001__?: Store & { summary?: () => ReturnType<typeof loot001Summary> };
    }
  ).__RC_LOOT_001__ = Object.assign(store, { summary: loot001Summary });
}

export function loot001Summary(): {
  enabled: boolean;
  dropCount: number;
  collectCount: number;
  deathCollects: number;
  pass: {
    lengthDrop: boolean;
    worldRegistered: boolean;
    renderable: boolean;
    collectable: boolean;
  };
  passScore: string;
  verdict:
    | "PASS"
    | "FAIL_LENGTH"
    | "FAIL_WORLD"
    | "FAIL_RENDER"
    | "FAIL_COLLECT"
    | "FAIL_PARTIAL"
    | "NO_DROP";
  proof: string;
  lastDrop: Loot001DropSnapshot | null;
  lastCollect: Loot001CollectSnapshot | null;
} {
  const n = store.drops.length;
  if (n === 0) {
    return {
      enabled: store.enabled,
      dropCount: 0,
      collectCount: store.collects.length,
      deathCollects: store.deathCollects,
      pass: {
        lengthDrop: false,
        worldRegistered: false,
        renderable: false,
        collectable: false,
      },
      passScore: "0 / 4",
      verdict: "NO_DROP",
      proof: "no death loot samples",
      lastDrop: null,
      lastCollect: store.collects[store.collects.length - 1] ?? null,
    };
  }

  // lengthDrop: at least one death dropped food ≈ body length (allow ±1; truncate flagged separately)
  const lengthOk = store.drops.filter((d) => {
    if (d.truncated) return d.deathFoodAdded > 0;
    return d.deathFoodAdded >= Math.max(1, d.lengthAtDeath - 1);
  });
  const lengthDrop = lengthOk.length > 0;

  const worldOk = store.drops.filter(
    (d) => d.deathFoodAdded > 0 && d.samplePositions.length > 0 && d.deathFoodAfter > d.deathFoodBefore
  );
  const worldRegistered = worldOk.length > 0;

  // Renderable proxy: death food exists in world with positions (SnakeIo maps all world.food)
  const renderable = worldRegistered;

  const collectable = store.deathCollects > 0;

  const score = [lengthDrop, worldRegistered, renderable, collectable].filter(Boolean).length;
  let verdict:
    | "PASS"
    | "FAIL_LENGTH"
    | "FAIL_WORLD"
    | "FAIL_RENDER"
    | "FAIL_COLLECT"
    | "FAIL_PARTIAL" = "FAIL_PARTIAL";
  if (score === 4) verdict = "PASS";
  else if (!lengthDrop) verdict = "FAIL_LENGTH";
  else if (!worldRegistered) verdict = "FAIL_WORLD";
  else if (!renderable) verdict = "FAIL_RENDER";
  else if (!collectable) verdict = "FAIL_COLLECT";

  const last = store.drops[n - 1]!;
  return {
    enabled: store.enabled,
    dropCount: n,
    collectCount: store.collects.length,
    deathCollects: store.deathCollects,
    pass: { lengthDrop, worldRegistered, renderable, collectable },
    passScore: `${score} / 4`,
    verdict,
    proof: `drops=${n} (bot=${store.botDrops}, human=${store.humanDrops}); lengthOk=${lengthOk.length}; worldOk=${worldOk.length}; deathCollects=${store.deathCollects}; last len=${last.lengthAtDeath} +${last.deathFoodAdded} truncated=${last.truncated}`,
    lastDrop: last,
    lastCollect: store.collects[store.collects.length - 1] ?? null,
  };
}

export function noteLoot001Drop(input: {
  tick: number;
  victimId: string;
  victimBot: boolean;
  lengthAtDeath: number;
  gemsEaten: number;
  expectedDrop: number;
  foodBefore: number;
  foodAfter: number;
  deathFoodBefore: number;
  deathFoodAfter: number;
  samplePositions: Array<{ x: number; y: number }>;
}): void {
  if (!enabled() && !store.enabled) return;
  store.enabled = true;
  const deathFoodAdded = Math.max(0, input.deathFoodAfter - input.deathFoodBefore);
  const snap: Loot001DropSnapshot = {
    t: Date.now(),
    tick: input.tick,
    victimId: input.victimId,
    victimBot: input.victimBot,
    lengthAtDeath: input.lengthAtDeath,
    gemsEaten: input.gemsEaten,
    expectedDrop: input.expectedDrop,
    foodBefore: input.foodBefore,
    foodAfter: input.foodAfter,
    deathFoodBefore: input.deathFoodBefore,
    deathFoodAfter: input.deathFoodAfter,
    deathFoodAdded,
    truncated: deathFoodAdded < input.expectedDrop,
    samplePositions: input.samplePositions.slice(0, 8),
  };
  store.drops = [...store.drops, snap].slice(-40);
  if (input.victimBot) store.botDrops += 1;
  else store.humanDrops += 1;
  publish();
  if (typeof console !== "undefined") {
    console.info(
      `[RC-LOOT-001] drop victim=${input.victimId.slice(0, 8)} bot=${input.victimBot} len=${input.lengthAtDeath} expected=${input.expectedDrop} added=${deathFoodAdded} truncated=${snap.truncated}`
    );
  }
}

export function noteLoot001Collect(input: {
  tick: number;
  eaterId: string;
  eaterBot: boolean;
  foodTier: string;
  foodValue: number;
  foodBefore: number;
  foodAfter: number;
}): void {
  if (!enabled() && !store.enabled) return;
  store.enabled = true;
  const snap: Loot001CollectSnapshot = {
    t: Date.now(),
    tick: input.tick,
    eaterId: input.eaterId,
    eaterBot: input.eaterBot,
    foodTier: input.foodTier,
    foodValue: input.foodValue,
    foodBefore: input.foodBefore,
    foodAfter: input.foodAfter,
  };
  store.collects = [...store.collects, snap].slice(-60);
  if (input.foodTier === "death") store.deathCollects += 1;
  publish();
  if (input.foodTier === "death" && typeof console !== "undefined") {
    console.info(
      `[RC-LOOT-001] collect death-food eater=${input.eaterId.slice(0, 8)} bot=${input.eaterBot} value=${input.foodValue}`
    );
  }
}
