export interface WhackAMoleState {
  active: number | null;
  /** Seconds the current mole stays visible before burrowing. */
  moleTicksLeft: number;
  score: number;
  timeLeft: number;
  combo: number;
  misses: number;
  status: "playing" | "over";
}

const GRID = 9;
const DURATION = 30;
const BASE_HIT = 10;
const MISS_PENALTY = 5;
const COMBO_STEP = 5;

function spawnChance(score: number): number {
  return Math.min(0.88, 0.52 + Math.floor(score / 35) * 0.035);
}

function moleVisibleTicks(score: number): number {
  if (score >= 120) return 1;
  if (score >= 60) return 2;
  return 3;
}

function hitPoints(combo: number): number {
  return BASE_HIT + Math.max(0, combo - 2) * COMBO_STEP;
}

export function createInitialState(): WhackAMoleState {
  return {
    active: null,
    moleTicksLeft: 0,
    score: 0,
    timeLeft: DURATION,
    combo: 0,
    misses: 0,
    status: "playing",
  };
}

export function tickIntervalMs(score: number): number {
  if (score >= 100) return 700;
  if (score >= 50) return 850;
  return 1000;
}

export function tick(state: WhackAMoleState): WhackAMoleState {
  if (state.status !== "playing") return state;

  const timeLeft = Math.max(0, state.timeLeft - 1);
  if (timeLeft <= 0) {
    return {
      active: null,
      moleTicksLeft: 0,
      score: state.score,
      timeLeft: 0,
      combo: 0,
      misses: state.misses,
      status: "over",
    };
  }

  let active = state.active;
  let moleTicksLeft = state.moleTicksLeft;
  let combo = state.combo;
  let misses = state.misses;

  if (active !== null) {
    moleTicksLeft -= 1;
    if (moleTicksLeft <= 0) {
      active = null;
      combo = 0;
      misses += 1;
    }
  }

  if (active === null && moleTicksLeft <= 0 && Math.random() < spawnChance(state.score)) {
    active = Math.floor(Math.random() * GRID);
    moleTicksLeft = moleVisibleTicks(state.score);
  }

  return {
    active,
    moleTicksLeft,
    score: state.score,
    timeLeft,
    combo,
    misses,
    status: "playing",
  };
}

export function whack(state: WhackAMoleState, index: number): WhackAMoleState {
  if (state.status !== "playing") return state;

  if (state.active !== index) {
    return {
      ...state,
      combo: 0,
      misses: state.misses + 1,
      score: Math.max(0, state.score - MISS_PENALTY),
    };
  }

  const combo = state.combo + 1;
  return {
    ...state,
    score: state.score + hitPoints(combo),
    combo,
    active: null,
    moleTicksLeft: 0,
  };
}
