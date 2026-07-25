/** Rule-engine Replay Score (0–1000). Epic5 full identity expands this. */
export function computeReplayScore(input: {
  totalPlays: number;
  currentStreak: number;
  achievementCount: number;
  totalAchievementCount: number;
  favoriteCount: number;
  totalTimeSec: number;
}): number {
  const {
    totalPlays,
    currentStreak,
    achievementCount,
    totalAchievementCount,
    favoriteCount,
    totalTimeSec,
  } = input;

  let score = 0;
  score += Math.min(totalPlays * 8, 200);
  score += Math.min(currentStreak * 15, 150);
  score +=
    totalAchievementCount > 0
      ? Math.round((achievementCount / totalAchievementCount) * 200)
      : 0;
  score += Math.min(favoriteCount * 20, 100);
  score += Math.min(Math.floor(totalTimeSec / 60), 350);

  return Math.min(1000, score);
}

export function replayScoreTier(score: number): string {
  if (score >= 800) return "Legend";
  if (score >= 600) return "Veteran";
  if (score >= 400) return "Regular";
  if (score >= 200) return "Rising";
  return "Rookie";
}
