// Color Match is a fast-paced REFLEX game: a target color swatch is shown
// and the player must tap the matching option before a short countdown
// runs out. There is no sequence to remember and no growing pattern — that
// design belongs to the separate "Simon" game. Keeping this file free of
// any memory/sequence mechanics is intentional so the two games stay
// distinct.
//
// This module is pure and has no DOM/timer access. The countdown is driven
// entirely by the `tick(state, dtSeconds)` function, which the component
// calls from its own requestAnimationFrame/setInterval loop. Nothing here
// reads the clock directly.

export type ColorName = "red" | "blue" | "green" | "yellow" | "purple" | "orange";

export const COLORS: ColorName[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
];

export const STARTING_LIVES = 3;
export const INITIAL_ROUND_DURATION_MS = 3000;
export const MIN_ROUND_DURATION_MS = 1200;
export const ROUND_DURATION_SHRINK_PER_ROUND_MS = 60;
export const BASE_OPTION_COUNT = 4;
export const MAX_OPTION_COUNT = 6;

export interface ColorMatchState {
  round: number;
  targetColor: ColorName; // the color name/swatch shown to the player as "match this"
  options: ColorName[]; // shuffled choices, guaranteed to include targetColor exactly once
  score: number;
  timeLeftMs: number; // countdown for the current round
  roundDurationMs: number; // reset value for timeLeftMs each round
  lives: number;
  status: "playing" | "over";
}

function randomColor(): ColorName {
  return COLORS[Math.floor(Math.random() * COLORS.length)]!;
}

/**
 * Builds an array containing `target` plus (count-1) other distinct colors
 * randomly chosen from COLORS (no duplicates), then shuffles the whole
 * array (Fisher-Yates) so target's position is random.
 */
function shuffledOptions(target: ColorName, count: number): ColorName[] {
  const others = COLORS.filter((c) => c !== target);
  // Shuffle `others` first so we can take a random subset without repeats.
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j]!, others[i]!];
  }

  const size = Math.min(count, COLORS.length);
  const chosenOthers = others.slice(0, size - 1);
  const options = [target, ...chosenOthers];

  // Fisher-Yates shuffle of the final option list, including target.
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j]!, options[i]!];
  }

  return options;
}

/**
 * Difficulty ramp: rounds get slightly shorter as the game progresses
 * (floored at MIN_ROUND_DURATION_MS) and, from round 5 onward, the number
 * of options widens by one every 5 rounds up to MAX_OPTION_COUNT. This is
 * an optional extra difficulty knob — a fixed option count of 4 would also
 * be a valid, simpler choice.
 */
function roundDurationFor(round: number): number {
  return Math.max(
    MIN_ROUND_DURATION_MS,
    INITIAL_ROUND_DURATION_MS - round * ROUND_DURATION_SHRINK_PER_ROUND_MS
  );
}

function optionCountFor(round: number): number {
  return Math.min(MAX_OPTION_COUNT, BASE_OPTION_COUNT + Math.floor(round / 5));
}

export function createInitialState(): ColorMatchState {
  const round = 1;
  const targetColor = randomColor();
  const roundDurationMs = INITIAL_ROUND_DURATION_MS;
  return {
    round,
    targetColor,
    options: shuffledOptions(targetColor, BASE_OPTION_COUNT),
    score: 0,
    timeLeftMs: roundDurationMs,
    roundDurationMs,
    lives: STARTING_LIVES,
    status: "playing",
  };
}

export function nextRound(state: ColorMatchState): ColorMatchState {
  const round = state.round + 1;
  const targetColor = randomColor();
  const roundDurationMs = roundDurationFor(round);
  const optionCount = optionCountFor(round);
  return {
    ...state,
    round,
    targetColor,
    options: shuffledOptions(targetColor, optionCount),
    timeLeftMs: roundDurationMs,
    roundDurationMs,
  };
}

/**
 * Shared "missed answer" handling used by both a wrong tap and a timeout:
 * decrement lives, end the game if lives are exhausted, otherwise advance
 * to a new round. A wrong-but-survived answer still moves on to a new
 * round (rather than retrying the same round) — this keeps the pace
 * snappy and the rule simple: every answer (right, wrong, or timed out)
 * advances the round; only lives and score differ based on correctness.
 */
function missRound(state: ColorMatchState): ColorMatchState {
  const lives = state.lives - 1;
  if (lives <= 0) {
    return { ...state, lives, status: "over" };
  }
  return nextRound({ ...state, lives });
}

export function selectColor(
  state: ColorMatchState,
  color: ColorName
): ColorMatchState {
  if (state.status !== "playing") {
    return state;
  }

  if (color === state.targetColor) {
    // Faster answers score more: base 10 points plus a bonus for
    // remaining time.
    const bonus = Math.floor(state.timeLeftMs / 100);
    const score = state.score + 10 + bonus;
    return nextRound({ ...state, score });
  }

  return missRound(state);
}

export function tick(
  state: ColorMatchState,
  dtSeconds: number
): ColorMatchState {
  if (state.status !== "playing") {
    return state;
  }

  const timeLeftMs = state.timeLeftMs - dtSeconds * 1000;
  if (timeLeftMs <= 0) {
    // A timeout is functionally a missed answer.
    return missRound(state);
  }

  return { ...state, timeLeftMs };
}
