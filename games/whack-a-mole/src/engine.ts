export interface WhackAMoleState {
  active: number | null;
  score: number;
  timeLeft: number;
  status: "playing" | "over";
}

const GRID = 9;
const DURATION = 30;

export function createInitialState(): WhackAMoleState {
  return { active: null, score: 0, timeLeft: DURATION, status: "playing" };
}

export function tick(state: WhackAMoleState): WhackAMoleState {
  if (state.status !== "playing") return state;
  const timeLeft = Math.max(0, state.timeLeft - 1);
  const active =
    timeLeft <= 0 ? null : Math.random() < 0.55 ? Math.floor(Math.random() * GRID) : state.active;
  return {
    active,
    score: state.score,
    timeLeft,
    status: timeLeft <= 0 ? "over" : "playing",
  };
}

export function whack(state: WhackAMoleState, index: number): WhackAMoleState {
  if (state.status !== "playing" || state.active !== index) return state;
  return { ...state, score: state.score + 10, active: null };
}
