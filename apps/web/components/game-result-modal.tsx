"use client";

import {
  getBestScore,
  getDailyMission,
  getDeviceId,
  getLevelProgress,
  getServerBestScoreSnapshot,
  getServerDailyMissionSnapshot,
  getServerLevelProgressSnapshot,
  isDailyChallengeComplete,
  subscribeBestScore,
  subscribeEngagement,
  subscribeMissions,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Coins, Sparkles, Trophy, Medal, Target, Library } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { getRuntimeConfig } from "@/lib/game-runtime-config";
import { getCurrentStage, getNextStage, getStageProgress } from "@/lib/game-stages";
import { getCompleted, getGameLibraryBadge, markCompleted, markMastered } from "@/lib/library-store";
import type { GameEndRewards } from "@/lib/retention-engine";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import { getMyRank } from "@/lib/supabase/scores";

export function GameResultModal({
  slug,
  score,
  rewards,
  games,
  recommend,
  onClose,
}: {
  slug: string;
  score: number;
  rewards: GameEndRewards;
  games: Game[];
  recommend?: Game;
  onClose: () => void;
}) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const best = useSyncExternalStore(
    useCallback((l: () => void) => subscribeBestScore(slug, l), [slug]),
    () => getBestScore(slug),
    () => getServerBestScoreSnapshot(slug)
  );
  const level = useSyncExternalStore(
    subscribeEngagement,
    getLevelProgress,
    getServerLevelProgressSnapshot
  );
  const mission = useSyncExternalStore(
    subscribeMissions,
    getDailyMission,
    getServerDailyMissionSnapshot
  );

  const [todayRank, setTodayRank] = useState<number | null>(null);
  const [weekRank, setWeekRank] = useState<number | null>(null);

  const stage = getCurrentStage(slug, score);
  const nextStage = getNextStage(slug, score);
  const progress = getStageProgress(slug, score);
  const runtime = getRuntimeConfig(slug);
  const bossBeat = score >= runtime.boss.threshold;
  const replayScore = buildWrappedSnapshot(games).replayScore;
  const missionPct =
    mission.missionIds.length > 0
      ? Math.round((mission.completed.length / mission.missionIds.length) * 100)
      : 0;
  const missionDone = isDailyChallengeComplete(mission);
  const inCollection = getCompleted().includes(slug);
  const badge = getGameLibraryBadge(slug, score, best);

  useEffect(() => {
    if (bossBeat) markCompleted(slug);
    if (!nextStage && progress >= 100) markMastered(slug);
  }, [bossBeat, slug, nextStage, progress]);

  useEffect(() => {
    const deviceId = getDeviceId();
    let active = true;
    Promise.all([
      getMyRank(slug, deviceId, "today"),
      getMyRank(slug, deviceId, "weekly"),
    ]).then(([today, week]) => {
      if (active) {
        setTodayRank(today);
        setWeekRank(week);
      }
    });
    return () => {
      active = false;
    };
  }, [slug, score]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/85 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-primary/30 bg-card p-6 shadow-2xl">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Result</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{score.toLocaleString()}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-4">
          <StatBox label="XP" value={`+${rewards.xpDisplay}`} highlight />
          <StatBox label="Coin" value={`+${rewards.coins}`} icon={<Coins className="mx-auto size-3 text-amber-400" />} />
          <StatBox label="Replay" value={String(replayScore)} />
          <StatBox label="Stage" value={stage.label} />
          <StatBox label="Best" value={best > 0 ? best.toLocaleString() : "—"} />
          <StatBox label="Today" value={todayRank ? `#${todayRank}` : "—"} icon={<Medal className="mx-auto size-3" />} />
          <StatBox label="Week" value={weekRank ? `#${weekRank}` : "—"} />
          <StatBox label="Level" value={`Lv.${level.level}`} />
        </div>

        {rewards.isNewBest ? (
          <p className="mt-3 flex items-center justify-center gap-1 text-sm font-medium text-emerald-400">
            <Trophy className="size-4" /> New Best!
          </p>
        ) : null}

        {bossBeat ? (
          <p className="mt-2 text-center text-sm font-bold text-amber-400">
            Boss: {runtime.boss.name} · +{runtime.boss.rewardCoins} bonus
          </p>
        ) : null}

        {progress >= 100 && nextStage ? (
          <p className="mt-2 text-center text-sm font-bold text-emerald-400">Stage Clear!</p>
        ) : null}

        <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-muted/20 p-3">
          <Row icon={<Target className="size-4 text-primary" />} label="Mission" value={missionDone ? "Complete" : `${missionPct}%`} />
          <Row icon={<Library className="size-4 text-primary" />} label="Collection" value={inCollection ? badge : badge} />
          {nextStage ? (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Sparkles className="size-3" /> Next: {nextStage.label}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href={`/games/${slug}`}>Retry</Link>} />
          {nextStage ? (
            <Button variant="secondary" nativeButton={false} render={<Link href={`/games/${slug}`}>Next Stage</Link>} />
          ) : null}
          {recommend ? (
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href={`/games/${recommend.slug}`}>Next · {recommend.title}</Link>}
            />
          ) : null}
          <Button variant="outline" nativeButton={false} render={<Link href="/">Continue</Link>} />
        </div>

        <button type="button" className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl px-2 py-2.5 ${highlight ? "bg-primary/10" : "bg-muted/40"}`}>
      {icon}
      <p className={`font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
