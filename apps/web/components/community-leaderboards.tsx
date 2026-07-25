"use client";

import type { Game } from "@game-platform/shared";
import { useEffect, useState, useSyncExternalStore } from "react";

import { subscribeLiveData, subscribeLiveProfile } from "@/lib/live-data-bus";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/supabase/scores";

export function CommunityTopPlayers({ games }: { games: Game[] }) {
  const slug = games[0]?.slug ?? "2048";
  const game = games.find((g) => g.slug === slug);
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  useEffect(() => {
    let active = true;
    function load() {
      getLeaderboard(slug, "weekly").then((data) => {
        if (active) setEntries(data.slice(0, 5));
      });
    }
    load();
    const unsub = subscribeLiveProfile((p) => {
      if (p.gameSlug === slug) load();
    });
    return () => {
      active = false;
      unsub();
    };
  }, [slug]);

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Top Players</h2>
        <span className="text-xs text-muted-foreground">{game?.title ?? slug}</span>
      </div>
      {entries === null ? (
        <p className="mt-3 text-sm text-muted-foreground">…</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">—</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {entries.map((e, i) => (
            <li
              key={`${e.nickname}-${i}`}
              className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-sm"
            >
              <span>
                <span className="text-muted-foreground">#{i + 1}</span> {e.nickname}
              </span>
              <span className="tabular-nums text-primary">{e.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function CommunityDailyRanking({ games }: { games: Game[] }) {
  const slug = games[0]?.slug ?? "2048";
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  useEffect(() => {
    let active = true;
    function load() {
      getLeaderboard(slug, "today").then((data) => {
        if (active) setEntries(data.slice(0, 3));
      });
    }
    load();
    const unsub = subscribeLiveProfile((p) => {
      if (p.gameSlug === slug) load();
    });
    return () => {
      active = false;
      unsub();
    };
  }, [slug]);

  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 backdrop-blur">
      <h2 className="font-semibold">Daily Challenge</h2>
      {entries === null ? (
        <p className="mt-2 text-sm text-muted-foreground">…</p>
      ) : (
        <ol className="mt-3 flex gap-2">
          {entries.map((e, i) => (
            <li
              key={`${e.nickname}-${i}`}
              className="flex flex-1 flex-col rounded-xl border border-white/10 bg-card/60 px-3 py-2 text-center"
            >
              <span className="text-xs text-muted-foreground">#{i + 1}</span>
              <span className="truncate text-sm font-medium">{e.nickname}</span>
              <span className="text-xs tabular-nums text-primary">{e.score}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
