// Pure sequence-memory game engine: no DOM access, no timers. The player
// watches a growing color sequence played back one step at a time, then
// must repeat it back in order. All playback pacing is owned by the React
// component (via setInterval/setTimeout) — this module only reacts to
// explicit calls and never reads the clock itself.

export type SimonColor = "red" | "blue" | "green" | "yellow";

export const COLORS: SimonColor[] = ["red", "blue", "green", "yellow"];

export type SimonPhase = "idle" | "playback" | "input" | "over";

export interface SimonState {
  sequence: SimonColor[];
  playbackIndex: number;
  inputIndex: number;
  phase: SimonPhase;
  round: number;
  score: number;
  bestRound: number;
}

const POINTS_PER_SEQUENCE_STEP = 10;

function randomColor(): SimonColor {
  const index = Math.floor(Math.random() * COLORS.length);
  return COLORS[index]!;
}

export function createInitialState(): SimonState {
  return {
    sequence: [],
    playbackIndex: 0,
    inputIndex: 0,
    phase: "idle",
    round: 0,
    score: 0,
    bestRound: 0,
  };
}

export function startRound(state: SimonState): SimonState {
  const sequence = [...state.sequence, randomColor()];
  return {
    ...state,
    sequence,
    playbackIndex: 0,
    phase: "playback",
    round: sequence.length,
  };
}

export function advancePlayback(state: SimonState): SimonState {
  if (state.phase !== "playback") {
    return state;
  }

  const nextIndex = state.playbackIndex + 1;
  if (nextIndex >= state.sequence.length) {
    return {
      ...state,
      phase: "input",
      inputIndex: 0,
    };
  }

  return {
    ...state,
    playbackIndex: nextIndex,
  };
}

export function submitInput(state: SimonState, color: SimonColor): SimonState {
  if (state.phase !== "input") {
    return state;
  }

  const expected = state.sequence[state.inputIndex];
  if (color !== expected) {
    return {
      ...state,
      phase: "over",
    };
  }

  const inputIndex = state.inputIndex + 1;
  if (inputIndex === state.sequence.length) {
    return {
      ...state,
      inputIndex,
      phase: "idle",
      score: state.score + POINTS_PER_SEQUENCE_STEP * state.sequence.length,
      bestRound: Math.max(state.bestRound, state.round),
    };
  }

  return {
    ...state,
    inputIndex,
  };
}
