"use client";

import {
  getBestScore,
  getDeviceId,
  getServerBestScoreSnapshot,
  subscribeBestScore,
} from "@game-platform/game-sdk";
import type { Difficulty } from "@game-platform/shared";
import { useEffect, useState, useSyncExternalStore } from "react";

import { getStagesForGame } from "@/lib/game-stages";
import { subscribeLiveData } from "@/lib/live-data-bus";
import {
  getLeaderboard,
  getMyRank,
  type LeaderboardEntry,
} from "@/lib/supabase/scores";

function useLiveBest(gameSlug: string): number {
  return useSyncExternalStore(
    (cb) => {
      const u1 = subscribeBestScore(gameSlug, cb);
      const u2 = subscribeLiveData(cb);
      return () => {
        u1();
        u2();
      };
    },
    () => getBestScore(gameSlug),
    () => getServerBestScoreSnapshot(gameSlug)
  );
}

export function GameDetailTop3({ gameSlug }: { gameSlug: string }) {
  const [top3, setTop3] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    function load() {
      getLeaderboard(gameSlug, "weekly").then((entries) => {
        if (active) setTop3(entries.slice(0, 3));
      });
    }
    load();
    const unsub = subscribeLiveData(load);
    return () => {
      active = false;
      unsub();
    };
  }, [gameSlug]);

  return (
    <div className="rounded-2xl border border-white/10 bg-card/50 p-4 backdrop-blur">
      <h3 className="font-semibold">Top 3</h3>
      {top3 === null ? (
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-muted/40" />
      ) : top3.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">—</p>
      ) : (
        <ol className="mt-3 grid gap-2 sm:grid-cols-3">
          {top3.map((entry, index) => (
            <li
              key={`${entry.nickname}-${index}`}
              className="rounded-xl border border-white/5 bg-background/40 px-3 py-3 text-center text-sm"
            >
              <span className="text-muted-foreground">#{index + 1}</span>
              <p className="truncate font-medium">{entry.nickname}</p>
              <p className="font-bold tabular-nums text-primary">
                {entry.score.toLocaleString()}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function GameDetailMyRecord({
  gameSlug,
  difficulty: _difficulty,
}: {
  gameSlug: string;
  difficulty: Difficulty;
}) {
  const best = useLiveBest(gameSlug);
  const [myRank, setMyRank] = useState<number | null>(null);
  const stages = getStagesForGame(gameSlug);

  useEffect(() => {
    let active = true;
    function load() {
      getMyRank(gameSlug, getDeviceId(), "weekly")
        .then((rank) => {
          if (active) setMyRank(rank);
        })
        .catch(() => {});
    }
    load();
    const unsub = subscribeLiveData(load);
    return () => {
      active = false;
      unsub();
    };
  }, [gameSlug]);

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 backdrop-blur">
      <h3 className="font-semibold">My Record</h3>
      <div className="mt-3 flex gap-6">
        <div>
          <p className="text-2xl font-bold tabular-nums text-primary">
            {best > 0 ? best.toLocaleString() : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Best</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {myRank !== null ? `#${myRank}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Weekly</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {stages.slice(0, 4).map((s) => (
          <span
            key={s.index}
            className={`rounded-full px-2 py-0.5 text-xs ${best >= s.target ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
