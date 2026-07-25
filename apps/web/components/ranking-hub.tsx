"use client";

import type { Game } from "@game-platform/shared";
import { Container, SectionTitle } from "@game-platform/ui";
import { useEffect, useState, useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/supabase/scores";

const PERIODS = [
  { id: "today" as const, label: "Today" },
  { id: "weekly" as const, label: "Week" },
  { id: "all" as const, label: "All Time" },
];

export function RankingHub({ games }: { games: Game[] }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("weekly");
  const [slug, setSlug] = useState(games[0]?.slug ?? "snake");
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  useEffect(() => {
    let active = true;
    getLeaderboard(slug, period).then((data) => {
      if (active) setEntries(data.slice(0, 10));
    });
    return () => {
      active = false;
    };
  }, [slug, period]);

  const game = games.find((g) => g.slug === slug);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`rounded-xl px-4 py-2 text-sm ${period === p.id ? "bg-primary text-primary-foreground" : "border border-white/10"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <select
        className="max-w-xs rounded-xl border bg-background px-3 py-2 text-sm"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        aria-label="Game"
      >
        {games.slice(0, 30).map((g) => (
          <option key={g.slug} value={g.slug}>
            {g.title}
          </option>
        ))}
      </select>

      <section className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
        <h2 className="font-semibold">{game?.title ?? slug} · {period}</h2>
        {entries === null ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No scores yet</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {entries.map((e, i) => (
              <li key={`${e.nickname}-${i}`} className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-sm">
                <span>
                  <span className="mr-2 font-bold text-primary">#{i + 1}</span>
                  {e.nickname}
                </span>
                <span className="tabular-nums font-semibold">{e.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export function RankingHubPage({ games }: { games: Game[] }) {
  return (
    <Container>
      <SectionTitle title="Rankings" description="Today · Week · Season · Friends" />
      <div className="mt-8">
        <RankingHub games={games} />
      </div>
    </Container>
  );
}
