export type Direction = "left" | "center" | "right";

export interface PenaltyState {
  score: number;
  round: number;
  maxRounds: number;
  lastResult: "goal" | "save" | null;
  status: "playing" | "over";
}

export function createInitialState(): PenaltyState {
  return { score: 0, round: 0, maxRounds: 5, lastResult: null, status: "playing" };
}

function goaliePick(): Direction {
  const dirs: Direction[] = ["left", "center", "right"];
  return dirs[Math.floor(Math.random() * 3)]!;
}

export function shoot(state: PenaltyState, dir: Direction): PenaltyState {
  if (state.status !== "playing") return state;
  const g = goaliePick();
  const goal = g !== dir;
  const round = state.round + 1;
  const score = state.score + (goal ? 1 : 0);
  return {
    score,
    round,
    maxRounds: state.maxRounds,
    lastResult: goal ? "goal" : "save",
    status: round >= state.maxRounds ? "over" : "playing",
  };
}

export function computeRankingScore(state: PenaltyState): number {
  return state.score * 100 + (state.maxRounds - state.round) * 10;
}
