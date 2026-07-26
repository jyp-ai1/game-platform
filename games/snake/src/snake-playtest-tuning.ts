/** Playtest Sprint — AI desync tuning (numbers only, adjust from play logs) */

export const PLAYTEST_AI = {
  /** Only rethink direction every N ticks + per-bot phase offset */
  thinkInterval: 3,
  /** Per-bot mistake variance (added to base mistake rate) */
  mistakeVariance: 0.08,
  /** Boost decision cadence — prevents simultaneous boost */
  boostCadence: 7,
  /** Pick 2nd-best direction sometimes (curved paths) */
  directionJitterChance: 0.18,
  /** Fraction of bots that update brain each tick (stagger) */
  brainBatchRatio: 0.55,
} as const;

/** Merge gate thresholds — Playtest Sprint */
export const PLAYTEST_MERGE_GATES = {
  avgPlayMin: 10,
  rematchRate: 0.6,
  spectatorRejoinRate: 0.4,
  aiHumanRate: 0.5,
  /** Observer: "재밌었다" YES rate */
  saidFunRate: 0.5,
  /** Minimum observation sheets before merge */
  minObservationSheets: 10,
  /** Blind test: Replay chosen over Slither */
  blindReplayRate: 0.6,
} as const;

/** Post-death action window (ms) — Replay's core KPI */
export const POST_DEATH_ACTION_MS = 3000;
