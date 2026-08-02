export type Direction = "left" | "center" | "right";

export interface PenaltyState {
  score: number;
  saves: number;
  round: number;
  maxRounds: number;
  suddenDeath: boolean;
  lastResult: "goal" | "save" | null;
  outcome: "win" | "lose" | null;
  status: "playing" | "over";
}

export function createInitialState(): PenaltyState {
  return {
    score: 0,
    saves: 0,
    round: 0,
    maxRounds: 5,
    suddenDeath: false,
    lastResult: null,
    outcome: null,
    status: "playing",
  };
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
  const saves = state.saves + (goal ? 0 : 1);
  const lastResult = goal ? "goal" : "save";

  if (score >= 3) {
    return { ...state, score, saves, round, lastResult, outcome: "win", status: "over" };
  }
  if (saves >= 3) {
    return { ...state, score, saves, round, lastResult, outcome: "lose", status: "over" };
  }

  const regulationDone = round >= state.maxRounds;
  if (!regulationDone) {
    return { ...state, score, saves, round, lastResult, status: "playing" };
  }

  if (state.suddenDeath) {
    return {
      ...state,
      score,
      saves,
      round,
      lastResult,
      outcome: goal ? "win" : "lose",
      status: "over",
    };
  }

  if (score !== saves) {
    return {
      ...state,
      score,
      saves,
      round,
      lastResult,
      outcome: score > saves ? "win" : "lose",
      status: "over",
    };
  }

  // Tied after 5 — enter sudden death on next kick
  return {
    ...state,
    score,
    saves,
    round,
    lastResult,
    suddenDeath: true,
    status: "playing",
  };
}

export function computeRankingScore(state: PenaltyState): number {
  if (state.outcome === "win") return state.score * 100 + 200;
  if (state.outcome === "lose") return state.score * 50;
  return state.score * 100;
}
