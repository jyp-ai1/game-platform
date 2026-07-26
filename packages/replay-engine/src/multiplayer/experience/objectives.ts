/** Match Objectives — beyond score-only competition. */
import type { MatchObjective, MatchObjectiveKind } from "@game-platform/shared";

const LABELS: Record<MatchObjectiveKind, string> = {
  score_race: "최고 점수",
  food_race: "100 Food 먼저",
  golden_apple: "Golden Apple 확보",
  boss_kill: "Boss 처치",
  survive_time: "10분 생존",
  overtake_friend: "친구 추월",
  flag_capture: "Flag 점령",
};

export function createObjective(kind: MatchObjectiveKind, target?: number): MatchObjective {
  const defaults: Record<MatchObjectiveKind, number> = {
    score_race: 500,
    food_race: 100,
    golden_apple: 1,
    boss_kill: 1,
    survive_time: 600,
    overtake_friend: 1,
    flag_capture: 3,
  };
  return {
    kind,
    target: target ?? defaults[kind],
    progress: {},
    label: LABELS[kind],
  };
}

export function progressObjective(
  obj: MatchObjective,
  deviceId: string,
  delta: number
): MatchObjective {
  const next = { ...obj, progress: { ...obj.progress } };
  next.progress[deviceId] = (next.progress[deviceId] ?? 0) + delta;
  const leader = Object.entries(next.progress).sort((a, b) => b[1] - a[1])[0];
  if (leader && leader[1] >= next.target) next.winnerId = leader[0];
  return next;
}

export function pickObjectiveForPlayers(count: number): MatchObjectiveKind {
  if (count <= 2) return "score_race";
  if (count <= 4) return "food_race";
  if (count <= 8) return "golden_apple";
  if (count <= 16) return "boss_kill";
  return "survive_time";
}
