"use client";

import {
  getLevelProgress,
  getServerLevelProgressSnapshot,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import { Button } from "@game-platform/ui";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { GameResultReplayMoment } from "@/components/game-result-replay-moment";
import type { UniversalRewardBundle } from "@/lib/reward-engine";
import { markCompleted, markMastered } from "@/lib/library-store";
import { getRuntimeConfig } from "@/lib/game-runtime-config";
import { getNextStage, getStageProgress } from "@/lib/game-stages";
import { subscribeLiveData } from "@/lib/live-data-bus";

/** Shown only when the player taps 종료 — never mid-play. */
export function GameResultModal({
  slug,
  score,
  rewards,
  onClose,
}: {
  slug: string;
  score: number;
  rewards: UniversalRewardBundle;
  games?: unknown[];
  recommend?: unknown;
  challengeId?: string | null;
  onClose: () => void;
}) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const level = useSyncExternalStore(
    subscribeEngagement,
    getLevelProgress,
    getServerLevelProgressSnapshot
  );

  const nextStage = getNextStage(slug, score);
  const progress = getStageProgress(slug, score);
  const runtime = getRuntimeConfig(slug);
  const bossBeat = score >= runtime.boss.threshold;

  useEffect(() => {
    if (bossBeat) markCompleted(slug);
    if (!nextStage && progress >= 100) markMastered(slug);
  }, [bossBeat, slug, nextStage, progress]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/85 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-white/10 bg-card p-6 shadow-2xl">
        <p className="text-sm font-semibold text-muted-foreground">오늘 플레이</p>

        <p className="mt-3 text-xs text-muted-foreground">점수</p>
        <p className="text-4xl font-bold tabular-nums">{score.toLocaleString()}</p>
        {rewards.isNewBest ? (
          <p className="mt-1 text-sm font-medium text-emerald-400">새 기록!</p>
        ) : null}

        <GameResultReplayMoment
          rewards={rewards}
          level={level.level}
          levelXpGain={rewards.xpDisplay}
        />

        <p className="mt-4 text-center text-xs text-muted-foreground">
          랭킹은 게임 페이지에서 확인하세요
        </p>

        <Button
          className="mt-6 h-12 w-full text-base font-semibold"
          nativeButton={false}
          render={<Link href={`/games/${slug}`}>게임으로</Link>}
        />

        <button
          type="button"
          className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
