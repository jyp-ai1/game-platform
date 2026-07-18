"use client";

import { cn } from "@game-platform/ui";
import { useEffect, useState } from "react";

import {
  getLeaderboard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "@/lib/supabase/scores";

// entries: null while loading. Keyed by gameSlug+period from the parent so
// changing the tab remounts this with a fresh `null` instead of needing an
// effect to explicitly reset a "loading" flag.
function LeaderboardList({
  gameSlug,
  period,
}: {
  gameSlug: string;
  period: LeaderboardPeriod;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    getLeaderboard(gameSlug, period).then((data) => {
      if (active) {
        setEntries(data);
      }
    });
    return () => {
      active = false;
    };
  }, [gameSlug, period]);

  if (entries === null) {
    return <p className="text-sm text-muted-foreground">불러오는 중...</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        아직 랭킹 기록이 없습니다. 첫 기록을 남겨보세요!
      </p>
    );
  }

  return (
    <ol className="max-h-80 divide-y overflow-y-auto rounded-lg border">
      {entries.map((entry, index) => (
        <li
          key={`${entry.nickname}-${index}`}
          className="flex items-center justify-between px-4 py-2 text-sm"
        >
          <span className="flex items-center gap-3">
            <span className="w-5 text-muted-foreground">{index + 1}</span>
            {entry.nickname}
          </span>
          <span className="font-semibold tabular-nums">{entry.score}</span>
        </li>
      ))}
    </ol>
  );
}

export function Leaderboard({ gameSlug }: { gameSlug: string }) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");

  return (
    <div>
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["today", "all"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setPeriod(tab)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              period === tab
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "today" ? "오늘" : "전체"}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <LeaderboardList key={`${gameSlug}-${period}`} gameSlug={gameSlug} period={period} />
      </div>
    </div>
  );
}
