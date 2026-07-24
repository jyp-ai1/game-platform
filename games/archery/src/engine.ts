export interface ArcheryState {
  score: number;
  arrowsLeft: number;
  lastPoints: number | null;
  status: "playing" | "over";
}

export function createInitialState(): ArcheryState {
  return { score: 0, arrowsLeft: 8, lastPoints: null, status: "playing" };
}

export function scoreFromClick(xPct: number, yPct: number): number {
  const dist = Math.sqrt((xPct - 50) ** 2 + (yPct - 50) ** 2);
  if (dist > 45) return 0;
  if (dist < 8) return 50;
  if (dist < 18) return 30;
  if (dist < 28) return 20;
  if (dist < 38) return 10;
  return 5;
}

export function shoot(state: ArcheryState, xPct: number, yPct: number): ArcheryState {
  if (state.status !== "playing") return state;
  const points = scoreFromClick(xPct, yPct);
  const arrowsLeft = state.arrowsLeft - 1;
  return {
    score: state.score + points,
    arrowsLeft,
    lastPoints: points,
    status: arrowsLeft <= 0 ? "over" : "playing",
  };
}
