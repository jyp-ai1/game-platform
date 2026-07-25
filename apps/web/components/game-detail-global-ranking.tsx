"use client";

import { getDeviceId, getServerBestScoreSnapshot, getBestScore, subscribeBestScore } from "@game-platform/game-sdk";
import { useEffect, useState, useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { getMyRank } from "@/lib/supabase/scores";

export function GameDetailGlobalRanking({ gameSlug }: { gameSlug: string }) {
  const best = useSyncExternalStore(
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
  const [todayRank, setTodayRank] = useState<number | null>(null);
  const [weekRank, setWeekRank] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    function load() {
      const deviceId = getDeviceId();
      Promise.all([
        getMyRank(gameSlug, deviceId, "today"),
        getMyRank(gameSlug, deviceId, "weekly"),
      ]).then(([today, week]) => {
        if (active) {
          setTodayRank(today);
          setWeekRank(week);
        }
      });
    }
    load();
    const unsub = subscribeLiveData(load);
    return () => {
      active = false;
      unsub();
    };
  }, [gameSlug, best]);

  return (
    <div className="rounded-2xl border border-white/10 bg-card/50 p-4 backdrop-blur">
      <h3 className="font-semibold">Global Ranking</h3>
      <div className="mt-3 grid grid-cols-2 gap-4 text-center">
        <div className="rounded-xl border border-white/5 bg-background/40 p-3">
          <p className="text-2xl font-bold tabular-nums text-primary">
            {todayRank !== null ? `#${todayRank}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Today</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-background/40 p-3">
          <p className="text-2xl font-bold tabular-nums">
            {weekRank !== null ? `#${weekRank}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">This Week</p>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Best {best > 0 ? best.toLocaleString() : "—"} · updates live
      </p>
    </div>
  );
}
