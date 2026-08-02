export const STARTING_SCORE = 501;

export interface DartsState {
  scoreRemaining: number;
  throwsLeft: number;
  lastPoints: number | null;
  status: "playing" | "won" | "over";
}

export function createInitialState(): DartsState {
  return { scoreRemaining: STARTING_SCORE, throwsLeft: 10, lastPoints: null, status: "playing" };
}

/** Ring scores: bull 50, inner 25, triple band, double band, outer */
export function scoreFromClick(xPct: number, yPct: number): number {
  const cx = 50;
  const cy = 50;
  const dx = xPct - cx;
  const dy = yPct - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 48) return 0;
  if (dist < 6) return 50;
  if (dist < 12) return 25;
  if (dist < 22) return 20;
  if (dist < 32) return 15;
  if (dist < 42) return 10;
  return 5;
}

export function throwDart(state: DartsState, xPct: number, yPct: number): DartsState {
  if (state.status !== "playing" || state.throwsLeft <= 0) return state;
  const points = scoreFromClick(xPct, yPct);
  const throwsLeft = state.throwsLeft - 1;
  const next = state.scoreRemaining - points;
  if (next < 0) {
    return {
      ...state,
      throwsLeft,
      lastPoints: points,
      status: throwsLeft <= 0 ? "over" : "playing",
    };
  }
  if (next === 0) {
    return { scoreRemaining: 0, throwsLeft, lastPoints: points, status: "won" };
  }
  return {
    scoreRemaining: next,
    throwsLeft,
    lastPoints: points,
    status: throwsLeft <= 0 ? "over" : "playing",
  };
}
