import type { DashboardPeriod } from "@/lib/supabase/admin-server";

export type SoftLaunchRates = {
  finishRate: number;
  rankingRate: number;
  missionRate: number;
  favoriteRate: number;
  retryRate: number;
};

export function computeSoftLaunchRates(
  funnel: Record<string, number> | null,
  dau: number,
  missionCompletes: number
): SoftLaunchRates {
  const gameStart = funnel?.game_start ?? 0;
  const gameEnd = funnel?.game_end ?? 0;
  const ranking = funnel?.ranking_submit ?? 0;
  const favorite = funnel?.favorite ?? 0;
  const session = funnel?.session ?? 0;

  const pct = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 100) : 0;

  // Retry: players with 2+ game_start approximated by game_start > session when skewed;
  // platform-level proxy: game_start / session when session > 0
  const retryRate =
    session > 0 && gameStart > session
      ? pct(gameStart - session, session)
      : pct(gameStart, Math.max(session, 1));

  return {
    finishRate: pct(gameEnd, gameStart),
    rankingRate: pct(ranking, gameStart),
    missionRate: pct(missionCompletes, dau),
    favoriteRate: pct(favorite, session),
    retryRate,
  };
}

export type WeeklyCompare = {
  label: string;
  dau: number;
  plays: number;
  scores: number;
};

export function computeWeeklyCompare(
  daily: Array<{
    day: string;
    dau: number;
    session_starts: number;
    score_submits: number;
  }>
): { thisWeek: WeeklyCompare; prevWeek: WeeklyCompare } {
  const sum = (rows: typeof daily) => ({
    dau: Math.round(rows.reduce((a, r) => a + r.dau, 0) / Math.max(rows.length, 1)),
    plays: rows.reduce((a, r) => a + r.session_starts, 0),
    scores: rows.reduce((a, r) => a + r.score_submits, 0),
  });

  const recent = daily.slice(0, 7);
  const previous = daily.slice(7, 14);

  return {
    thisWeek: { label: "최근 7일", ...sum(recent) },
    prevWeek: { label: "이전 7일", ...sum(previous) },
  };
}

export const SOFT_LAUNCH_DOC_LINKS = [
  {
    label: "Soft Launch Checklist",
    href: "https://github.com/jyp-ai1/game-platform/blob/main/docs/soft-launch-checklist.md",
  },
  {
    label: "Feedback Log",
    href: "https://github.com/jyp-ai1/game-platform/blob/main/docs/feedback-log.md",
  },
  {
    label: "Known Issues",
    href: "https://github.com/jyp-ai1/game-platform/blob/main/docs/known-issues.md",
  },
  {
    label: "Soft Launch Summary",
    href: "https://github.com/jyp-ai1/game-platform/blob/main/docs/reports/soft-launch-summary.md",
  },
  {
    label: "Operator Manual",
    href: "https://github.com/jyp-ai1/game-platform/blob/main/docs/operator-manual.md",
  },
] as const;
