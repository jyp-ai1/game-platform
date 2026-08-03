/**
 * RC-DEATH-005 — Death → Corpse remove → Gem spawn (observe only).
 * Scope: corpse/gem/killFeed. NOT respawn / overlay / leaderboard.
 *
 * Enable: ?debug=1
 * Read: window.__RC_DEATH_005__
 */
export interface Death005Snapshot {
  t: number;
  tick: number;
  victimId: string;
  victimBot: boolean;
  killerId?: string;
  /** world.snakes still has victim after killSnake */
  stillInWorld: boolean;
  segmentsAfter: number;
  segmentCountAfter: number | null;
  /** Did kill clear body for render? */
  corpseCleared: boolean;
  foodBefore: number;
  foodAfter: number;
  deathFoodAdded: number;
  deathFoodTotal: number;
  killFeedLen: number;
  killFeedHasVictim: boolean;
  alive: boolean;
  spectating: boolean;
}

type Store = {
  rc: "RC-DEATH-005";
  enabled: boolean;
  deaths: Death005Snapshot[];
  botDeaths: number;
  humanDeaths: number;
};

let store: Store = empty();

function empty(): Store {
  return {
    rc: "RC-DEATH-005",
    enabled: false,
    deaths: [],
    botDeaths: 0,
    humanDeaths: 0,
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

export function initDeath005Trace(): void {
  store = empty();
  store.enabled = enabled();
  publish();
  if (store.enabled) console.info("[RC-DEATH-005] corpse→gem probe ON — window.__RC_DEATH_005__");
}

function publish(): void {
  if (typeof window === "undefined") return;
  store.enabled = store.enabled || enabled();
  (
    window as Window & {
      __RC_DEATH_005__?: Store & { summary?: () => ReturnType<typeof death005Summary> };
    }
  ).__RC_DEATH_005__ = Object.assign(store, { summary: death005Summary });
}

export function death005Summary(): {
  enabled: boolean;
  deathCount: number;
  botDeaths: number;
  humanDeaths: number;
  /** PASS items for CPO checklist (any observed death) */
  pass: {
    corpseGone: boolean;
    gemSpawned: boolean;
    killFeed: boolean;
  };
  passScore: string;
  verdict: "PASS" | "FAIL_CORPSE" | "FAIL_GEM" | "FAIL_KILLFEED" | "FAIL_PARTIAL" | "NO_DEATH";
  proof: string;
  last: Death005Snapshot | null;
} {
  const n = store.deaths.length;
  if (n === 0) {
    return {
      enabled: store.enabled,
      deathCount: 0,
      botDeaths: 0,
      humanDeaths: 0,
      pass: { corpseGone: false, gemSpawned: false, killFeed: false },
      passScore: "0 / 3",
      verdict: "NO_DEATH",
      proof: "no killSnake snapshots yet",
      last: null,
    };
  }
  const last = store.deaths[store.deaths.length - 1]!;
  // CPO: corpse gone = not still drawable body (segments cleared OR removed from world)
  const corpseGoneSamples = store.deaths.filter((d) => d.corpseCleared || !d.stillInWorld);
  const gemSamples = store.deaths.filter((d) => d.deathFoodAdded > 0);
  const feedSamples = store.deaths.filter((d) => d.killFeedHasVictim);
  const corpseGone = corpseGoneSamples.length === store.deaths.length;
  const gemSpawned = gemSamples.length > 0;
  const killFeed = feedSamples.length > 0;
  const score = [corpseGone, gemSpawned, killFeed].filter(Boolean).length;

  let verdict: "PASS" | "FAIL_CORPSE" | "FAIL_GEM" | "FAIL_KILLFEED" | "FAIL_PARTIAL" | "NO_DEATH" =
    "FAIL_PARTIAL";
  if (score === 3) verdict = "PASS";
  else if (!corpseGone && gemSpawned && killFeed) verdict = "FAIL_CORPSE";
  else if (corpseGone && !gemSpawned) verdict = "FAIL_GEM";
  else if (corpseGone && gemSpawned && !killFeed) verdict = "FAIL_KILLFEED";
  else verdict = "FAIL_PARTIAL";

  const failCorpseCount = store.deaths.filter((d) => !d.corpseCleared && d.stillInWorld).length;
  return {
    enabled: store.enabled,
    deathCount: n,
    botDeaths: store.botDeaths,
    humanDeaths: store.humanDeaths,
    pass: { corpseGone, gemSpawned, killFeed },
    passScore: `${score} / 3`,
    verdict,
    proof: `deaths=${n} (bot=${store.botDeaths}, human=${store.humanDeaths}); corpseRemain=${failCorpseCount}; gemOk=${gemSamples.length}; feedOk=${feedSamples.length}; last segs=${last.segmentsAfter} deathFood+${last.deathFoodAdded}`,
    last,
  };
}

/** Call at end of killSnake after state mutations. Observe only. */
export function noteDeath005(input: {
  tick: number;
  victimId: string;
  victimBot: boolean;
  killerId?: string;
  stillInWorld: boolean;
  segmentsAfter: number;
  segmentCountAfter: number | null;
  foodBefore: number;
  foodAfter: number;
  deathFoodAfter: number;
  deathFoodBefore: number;
  killFeedLen: number;
  killFeedHasVictim: boolean;
  alive: boolean;
  spectating: boolean;
}): void {
  if (typeof window === "undefined") return;
  if (!store.enabled && !enabled()) return;
  store.enabled = true;

  const deathFoodAdded = Math.max(0, input.deathFoodAfter - input.deathFoodBefore);
  const corpseCleared = input.segmentsAfter === 0 || !input.stillInWorld;
  const snap: Death005Snapshot = {
    t: Date.now(),
    tick: input.tick,
    victimId: input.victimId,
    victimBot: input.victimBot,
    killerId: input.killerId,
    stillInWorld: input.stillInWorld,
    segmentsAfter: input.segmentsAfter,
    segmentCountAfter: input.segmentCountAfter,
    corpseCleared,
    foodBefore: input.foodBefore,
    foodAfter: input.foodAfter,
    deathFoodAdded,
    deathFoodTotal: input.deathFoodAfter,
    killFeedLen: input.killFeedLen,
    killFeedHasVictim: input.killFeedHasVictim,
    alive: input.alive,
    spectating: input.spectating,
  };
  store.deaths.push(snap);
  if (store.deaths.length > 80) store.deaths.splice(0, store.deaths.length - 80);
  if (input.victimBot) store.botDeaths += 1;
  else store.humanDeaths += 1;
  publish();
  if (typeof console !== "undefined") {
    console.info(
      `[RC-DEATH-005] ${input.victimBot ? "bot" : "human"} ${input.victimId} corpseCleared=${corpseCleared} segs=${input.segmentsAfter} deathFood+${deathFoodAdded} feed=${input.killFeedHasVictim} stillInWorld=${input.stillInWorld}`
    );
  }
}
