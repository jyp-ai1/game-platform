/** Human vs CPU board games — shared status + difficulty for Pass 2 Rule. */

export type BoardGameStatus = "playing" | "won" | "lost" | "over";

export type CpuDifficulty = "easy" | "normal" | "hard";

export const DIFFICULTY_STAGE: Record<CpuDifficulty, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
};

export function humanVsCpuStatus(
  winner: null | "draw" | string | number,
  humanSide: string | number,
  cpuSide: string | number
): BoardGameStatus {
  if (winner === null) return "playing";
  if (winner === "draw") return "over";
  if (winner === humanSide) return "won";
  if (winner === cpuSide) return "lost";
  return "over";
}

export function pickCpuMove<T>(
  difficulty: CpuDifficulty,
  legal: readonly T[],
  smartPick: () => T
): T {
  if (legal.length === 0) {
    throw new Error("pickCpuMove: no legal moves");
  }
  if (difficulty === "easy") {
    return legal[Math.floor(Math.random() * legal.length)]!;
  }
  return smartPick();
}
