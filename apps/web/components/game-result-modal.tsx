"use client";

import {
  getBestScore,
  getDeviceId,
  getLevelProgress,
  getServerBestScoreSnapshot,
  getServerLevelProgressSnapshot,
  subscribeBestScore,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { getRuntimeConfig } from "@/lib/game-runtime-config";
import { getNextStage, getStageProgress } from "@/lib/game-stages";
import { markCompleted, markMastered } from "@/lib/library-store";
import type { UniversalRewardBundle } from "@/lib/reward-engine";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { getMyRank, getLeaderboard } from "@/lib/supabase/scores";
import { GameEndMotivation } from "@/components/game-end-motivation";
import { GameResultLoopNav } from "@/components/game-result-loop-nav";
import { GameResultReplayMoment } from "@/components/game-result-replay-moment";
import { getChallenge, getChallengeUrl } from "@/lib/challenge-scores-store";
import {
  getTodayMissionProgress,
  isTodayMissionMixComplete,
} from "@/lib/universal-mission-engine";

export function GameResultModal({
  slug,
  score,
  rewards,
  games,
  recommend,
  challengeId,
  onClose,
}: {
  slug: string;
  score: number;
  rewards: UniversalRewardBundle;
  games: Game[];
  recommend?: Game;
  challengeId?: string | null;
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
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const [todayRank, setTodayRank] = useState<number | null>(null);
  const [top10Gap, setTop10Gap] = useState<number | null>(null);

  const nextStage = getNextStage(slug, score);
  const progress = getStageProgress(slug, score);
  const runtime = getRuntimeConfig(slug);
  const bossBeat = score >= runtime.boss.threshold;
  const missionDone = isTodayMissionMixComplete();
  const challenge = challengeId ? getChallenge(challengeId) : null;
  const isChallenger = challenge?.challengerId === getDeviceId();
  const myChallengeScore = isChallenger ? score : challenge?.targetScore;
  const theirChallengeScore = isChallenger ? challenge?.targetScore : challenge?.challengerScore;
  const challengeWin =
    challenge &&
    myChallengeScore != null &&
    theirChallengeScore != null &&
    myChallengeScore > theirChallengeScore;

  useEffect(() => {
    if (bossBeat) markCompleted(slug);
    if (!nextStage && progress >= 100) markMastered(slug);
  }, [bossBeat, slug, nextStage, progress]);

  useEffect(() => {
    const deviceId = getDeviceId();
    let active = true;
    Promise.all([getMyRank(slug, deviceId, "today"), getLeaderboard(slug, "today")]).then(
      ([today, board]) => {
        if (!active) return;
        setTodayRank(today);
        const tenth = board[9]?.score;
        if (tenth != null && score < tenth) {
          setTop10Gap(tenth - score);
        } else {
          setTop10Gap(null);
        }
      }
    );
    return () => {
      active = false;
    };
  }, [slug, score]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/85 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-primary/30 bg-card p-6 shadow-2xl">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Replay</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{score.toLocaleString()}</p>

        <GameEndMotivation
          slug={slug}
          score={score}
          isNewBest={rewards.isNewBest}
          best={best}
          todayRank={todayRank}
          top10Gap={top10Gap}
        />

        <GameResultReplayMoment
          slug={slug}
          score={score}
          rewards={rewards}
          games={games}
          recommend={recommend}
          level={level.level}
          levelXpGain={rewards.xpDisplay}
          todayRank={todayRank}
          top10Gap={top10Gap}
        />

        {challenge ? (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              vs {challenge.targetNickname}
            </p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span>You: {myChallengeScore?.toLocaleString() ?? score.toLocaleString()}</span>
              <span className="text-muted-foreground">vs</span>
              <span>Them: {theirChallengeScore?.toLocaleString() ?? "pending"}</span>
            </div>
            {challenge.status === "complete" ? (
              <p
                className={`mt-2 text-center text-sm font-bold ${challengeWin ? "text-emerald-400" : "text-amber-400"}`}
              >
                {challengeWin ? "You win!" : "They lead — rematch?"}
              </p>
            ) : (
              <p className="mt-2 text-center text-xs text-muted-foreground">Waiting for opponent…</p>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold">친구에게 도전장 보내기</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {score.toLocaleString()}점 — 친구가 이길 수 있을까요?
            </p>
            <Button
              className="mt-3 w-full gap-1"
              size="sm"
              nativeButton={false}
              render={<Link href={`/community?challenge=${slug}`}>도전장 보내기 →</Link>}
            />
          </div>
        )}

        <GameResultLoopNav slug={slug} recommendSlug={recommend?.slug} missionDone={missionDone} />

        <div className="mt-6 flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href={`/games/${slug}`}>Retry</Link>} />
          {challenge ? (
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href={getChallengeUrl(challenge.id, slug)}>Rematch</Link>}
            />
          ) : null}
          {recommend ? (
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href={`/games/${recommend.slug}`}>Next · {recommend.title}</Link>}
            />
          ) : null}
          <Button variant="outline" nativeButton={false} render={<Link href="/journey">Journey →</Link>} />
        </div>

        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
