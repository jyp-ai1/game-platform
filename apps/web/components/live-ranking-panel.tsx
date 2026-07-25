"use client";

import type { Game } from "@game-platform/shared";
import { Badge } from "@game-platform/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/supabase/scores";

export function LiveRankingPanel({ games, gameSlug }: { games: Game[]; gameSlug?: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<"today" | "weekly" | "all">("weekly");

  const load = useCallback(async () => {
    const slug = gameSlug ?? games[0]?.slug;
    if (!slug) return;
    const board = await getLeaderboard(slug, period);
    setEntries(board.slice(0, 100));
  }, [games, gameSlug, period]);

  useEffect(() => {
    load();
    return subscribeLiveData(load);
  }, [load]);

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Live TOP100</h3>
        <div className="flex gap-1 text-xs">
          {(["today", "weekly", "all"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-2 py-1 capitalize ${period === p ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto">
        {entries.length === 0 ? (
          <li className="text-sm text-muted-foreground">Loading rankings…</li>
        ) : (
          entries.map((e, i) => (
            <li
              key={`${e.nickname}-${i}`}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-primary/5"
            >
              <span>
                <span className="mr-2 font-bold text-primary">#{i + 1}</span>
                {e.nickname}
              </span>
              <span className="tabular-nums font-medium">{e.score.toLocaleString()}</span>
            </li>
          ))
        )}
      </ul>
      <Link href="/community" className="mt-3 block text-xs text-primary hover:underline">
        Friends ranking →
      </Link>
    </section>
  );
}
