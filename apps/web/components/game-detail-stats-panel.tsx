"use client";

import { getBestScore, getDeviceId } from "@game-platform/game-sdk";
import type { Difficulty } from "@game-platform/shared";
import { useEffect, useState } from "react";

import { formatDifficulty } from "@/lib/difficulty";
import { getGameBalanceMeta } from "@/lib/game-balance";
import {
  getLeaderboard,
  getMyRank,
  type LeaderboardEntry,
} from "@/lib/supabase/scores";

export function GameDetailStatsPanel({
  gameSlug,
  difficulty,
}: {
  gameSlug: string;
  difficulty: Difficulty;
}) {
  const balance = getGameBalanceMeta(gameSlug, difficulty);
  const best = getBestScore(gameSlug);
  const [top3, setTop3] = useState<LeaderboardEntry[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getLeaderboard(gameSlug, "weekly")
      .then((entries) => {
        if (active) setTop3(entries.slice(0, 3));
      })
      .catch(() => {
        if (active) setTop3([]);
      });
    getMyRank(gameSlug, getDeviceId(), "weekly")
      .then((rank) => {
        if (active) setMyRank(rank);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [gameSlug]);

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm lg:p-5">
      <h2 className="text-lg font-semibold">게임 정보</h2>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">난이도</dt>
          <dd className="font-medium">{formatDifficulty(difficulty)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">플레이 시간</dt>
          <dd className="font-medium">{balance.playTimeLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">내 최고 기록</dt>
          <dd className="font-semibold tabular-nums">
            {best > 0 ? best.toLocaleString() : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">주간 내 순위</dt>
          <dd className="font-semibold tabular-nums">
            {myRank !== null ? `#${myRank}` : "미랭킹"}
          </dd>
        </div>
      </dl>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Top 3 · 주간
        </p>
        {top3 === null ? (
          <p className="mt-2 text-sm text-muted-foreground">불러오는 중...</p>
        ) : top3.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">아직 기록이 없습니다.</p>
        ) : (
          <ol className="mt-2 space-y-1.5">
            {top3.map((entry, index) => (
              <li
                key={`${entry.nickname}-${index}`}
                className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
              >
                <span>
                  <span className="mr-2 text-muted-foreground">{index + 1}</span>
                  {entry.nickname}
                </span>
                <span className="font-semibold tabular-nums">{entry.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
