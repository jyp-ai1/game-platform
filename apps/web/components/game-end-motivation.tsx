"use client";

import type { Game } from "@game-platform/shared";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/supabase/scores";
import { getNextStage, getStageProgress } from "@/lib/game-stages";
import { getFriendBeatGap } from "@/lib/replay-identity";
import { Sparkles, Trophy, Users, Target } from "lucide-react";
import { useEffect, useState } from "react";

export function GameEndMotivation({
  slug,
  score,
  isNewBest,
  best,
  todayRank,
  top10Gap,
}: {
  slug: string;
  score: number;
  isNewBest: boolean;
  best: number;
  todayRank: number | null;
  top10Gap?: number | null;
}) {
  const [top3, setTop3] = useState<LeaderboardEntry[]>([]);
  const nextStage = getNextStage(slug, score);
  const stageProgress = getStageProgress(slug, score);
  const friend = getFriendBeatGap(slug, score);

  useEffect(() => {
    getLeaderboard(slug, "today").then((entries) => setTop3(entries.slice(0, 3)));
  }, [slug, score]);

  const thirdScore = top3[2]?.score ?? 0;
  const gapToTop3 =
    todayRank !== null && todayRank > 3 && thirdScore > 0
      ? thirdScore - score
      : todayRank === null && thirdScore > score
        ? thirdScore - score
        : null;

  const nextStageGap =
    nextStage && stageProgress < 100
      ? Math.max(0, Math.round((100 - stageProgress) * 50))
      : null;

  const hooks = [
    isNewBest
      ? { icon: Trophy, text: "이번 최고점", value: `+${score.toLocaleString()}`, color: "text-emerald-400" }
      : best > score
        ? { icon: Trophy, text: "최고점까지", value: `${(best - score).toLocaleString()}점`, color: "text-amber-400" }
        : null,
    gapToTop3 !== null && gapToTop3 > 0
      ? { icon: Sparkles, text: "오늘 TOP3까지", value: `${gapToTop3.toLocaleString()}점`, color: "text-primary" }
      : todayRank !== null && todayRank <= 3
        ? { icon: Sparkles, text: "오늘 TOP3", value: `#${todayRank} 🎉`, color: "text-emerald-400" }
        : null,
    top10Gap != null && top10Gap > 0
      ? { icon: Sparkles, text: "오늘 TOP10까지", value: `${top10Gap.toLocaleString()}점`, color: "text-primary" }
      : todayRank !== null && todayRank <= 10
        ? { icon: Sparkles, text: "오늘 TOP10", value: `#${todayRank}`, color: "text-emerald-400" }
        : null,
    nextStageGap !== null
      ? { icon: Target, text: `다음 Stage · ${nextStage?.label}`, value: `${nextStageGap}점`, color: "text-primary" }
      : null,
    friend.gap > 0
      ? { icon: Users, text: `친구 ${friend.nickname}보다`, value: `${friend.gap.toLocaleString()}점 낮음`, color: "text-amber-400" }
      : friend.gap <= 0
        ? { icon: Users, text: `친구 ${friend.nickname} 이김!`, value: `${Math.abs(friend.gap).toLocaleString()}점 앞`, color: "text-emerald-400" }
        : null,
  ].filter(Boolean) as Array<{ icon: typeof Trophy; text: string; value: string; color: string }>;

  if (hooks.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-card/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">한 판 더?</p>
      <ul className="mt-3 space-y-2">
        {hooks.map((h) => (
          <li key={h.text} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <h.icon className={`size-4 ${h.color}`} />
              {h.text}
            </span>
            <span className={`font-bold tabular-nums ${h.color}`}>{h.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
